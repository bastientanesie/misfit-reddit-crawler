'use strict';

const snoowrap = require('snoowrap');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const packageJson = require(path.join(__dirname, '..', 'package.json'));
const User = require('./user');

/**
 * @param {Node} node
 * @return {Node|null}
 */
function findTextNode(node) {
    if (node.nodeName === '#text') {
        return node;
    }
    if (node.childNodes.length < 1) {
        return null;
    }

    for (const childNode of node.childNodes) {
        const textNode = findTextNode(childNode);
        if (textNode.nodeName === '#text') {
            return textNode;
        }
    }
}

class Crawler {
    /**
     *
     * @param {String} clientId
     * @param {String} clientSecret
     * @param {String} subredditName
     */
    constructor(clientId, clientSecret, subredditName) {
        /**
         * Reddit API client (app) ID
         * @type {String}
         * @private
         */
        this._clientId = clientId;

        /**
         * Reddit API client (app) secret
         * @type {String}
         * @private
         */
        this._clientSecret = clientSecret;

        /**
         * Target subreddit's name
         * @type {String}
         * @private
         */
        this._subredditName = subredditName;

        /**
         * Path to the JSON file storing our data
         * @type {String}
         * @private
         */
        this._filepath = path.join(__dirname, '..', 'data.json');

        /**
         * API instance associated to MC's subreddit
         * @type {Subreddit|null}
         * @private
         */
        this._subreddit = null;

        /**
         *
         * @type {{processedAARCommentIds: String[], excludedRedditIds: String[], unknownPlayers: String[], users: User[]}}
         * @private
         */
        this._data = {
            /** IDs of AAR comments that have been processed */
            processedAARCommentIds: [],
            /** Reddit usernames excluded from our data */
            excludedRedditIds: [],
            /** Player names that doesn't match our data */
            unknownPlayers: [],
            /** User objects with their stats */
            users: [],
        };
    }

    /**
     * Fetch all the AARs published in the given timeframe, and process them
     * to find out members activity
     *
     * @param {String} timeframe Available values: hour, day, week, month (default), year, all
     * @return {Promise<number>} Numbre of AARs processed
     */
    async processAARActivity(timeframe = 'month') {
        let processedSubmissionCount = 0;

        // Makes sure the timeframe is correct
        const allowedTimeframeValues = ['hour', 'day', 'week', 'month', 'year', 'all'];
        if (! allowedTimeframeValues.includes(timeframe)) {
            timeframe = 'month';
        }

        /** @type {Subreddit} */
        const subreddit = await this._getSubreddit();

        // Find every reddit posts containing the word "AAR"
        const submissions = await (await subreddit.search({
            syntax: 'lucene',
            query: 'flair_text:AAR',
            time: timeframe,
        })).fetchAll();

        for (const submission of submissions) {
            // Makes sure that this entry actually contains the full word "AAR"
            if (! submission.title.includes('AAR')) {
                continue;
            }

            const date = new Date(submission.created * 1000);
            this._debug(`${submission.title} (${date.toLocaleDateString()})`);
            ++processedSubmissionCount;

            // If there's no comment, we can skip this entry
            if (submission.num_comments < 1) {
                continue;
            }

            // Fetch all comments, excluding comment replies
            const comments = await submission.expandReplies({
                limit: Infinity,
                depth: 1,
            }).comments;

            for (const comment of comments) {
                // Skips mission maker's comments
                if (comment.author.name === submission.author.name) {
                    continue;
                }
                // Checks if it's an excluded reddit username
                if (this._data.excludedRedditIds.includes(comment.author.name)) {
                    continue;
                }
                // Checks if we've already processed that comment
                if (this._data.processedAARCommentIds.includes(comment.id)) {
                    continue;
                }

                // Creates this user's object if it doesn't already exist
                let user = this._data.users.find((user) => {
                    return user.redditId === comment.author.name;
                });
                if (! user) {
                    user = User.createFromReddit(comment.author.name);
                }

                // Increment this user's AAR counter
                user.aarCount++;

                // Store this comment ID so we don't process it multiple times
                this._data.processedAARCommentIds.push(comment.id);
            }
        }

        return processedSubmissionCount;
    }

    /**
     * Fetch all the Event submissions published in the given timeframe, and process them
     * to find out signups
     *
     * @param {String} timeframe Available values: hour, day, week, month (default), year, all
     * @return {Promise<number>} Numbre of AARs processed
     */
    async processSignups(timeframe) {
        let processedSubmissionCount = 0;

        // Makes sure the timeframe is correct
        const allowedTimeframeValues = ['hour', 'day', 'week', 'month', 'year', 'all'];
        if (! allowedTimeframeValues.includes(timeframe)) {
            timeframe = 'month';
        }

        /** @type {Subreddit} */
        const subreddit = await this._getSubreddit();

        // Find every reddit posts containing the word "AAR"
        const submissions = await (await subreddit.search({
            syntax: 'lucene',
            query: 'flair_text:Event',
            time: timeframe,
        })).fetchAll();

        for (const submission of submissions) {
            const submissionDate = new Date(submission.created * 1000);
            this._debug(`${submission.title} (${submissionDate.toLocaleDateString()})`);
            ++processedSubmissionCount;

            if (process.env.DEBUG === 'true') {
                // Saves the HTML code into the /logs folder
                const permalinkParts = submission.permalink.split('/');
                fs.writeFileSync(
                    path.join(__dirname, '..', 'logs', `${permalinkParts[permalinkParts.length - 2]}.html`),
                    submission.selftext_html
                );
            }

            let slots = [];
            const html = parse5.parseFragment(submission.selftext_html);
            for (const rootNode of html.childNodes) {
                // Skips comments and the like
                if (! rootNode.hasOwnProperty('tagName')) {
                    continue;
                }
                // If we have slots, this means we can end the loop at this point
                if (slots.length > 0) {
                    continue;
                }

                // Finds all <tr> elements of the signup table (hopefully skipping other tables)
                const rowElements = rootNode.childNodes.filter((node) => {
                    // Excludes every element that is not a <table>
                    if (! node.hasOwnProperty('tagName')) {
                        return false;
                    }
                    return node.nodeName === 'table';
                }).reduce((result, table) => {
                    const rows = [];

                    // Returns a map of all <tr> found in each <table>
                    for (const node of table.childNodes) {
                        // It can be a single <tr>, or
                        // a <tbody> containing multiple <tr>
                        if (! node.hasOwnProperty('tagName')) {
                            continue;
                        }
                        if (node.nodeName === 'tr') {
                            rows.push(node);
                            continue;
                        }
                        if (node.nodeName === 'tbody') {
                            for (const childNode of node.childNodes) {
                                if (! node.hasOwnProperty('tagName')) {
                                    continue;
                                }
                                if (childNode.nodeName === 'tr') {
                                    rows.push(childNode);
                                }
                            }
                        }
                    }

                    // If the table has less than 10 rows, it's probably
                    // not the signup table we're looking for
                    if (rows.length < 10) {
                        return result;
                    }

                    // Adds the <tr> we found to the end result
                    return result.concat(rows);
                }, []);

                slots = rowElements.reduce((result, rowElement) => {
                    // Excludes everything but <th> and <td>
                    const cellElements = rowElement.childNodes.filter((node) => {
                        if (! node.hasOwnProperty('tagName')) {
                            return false;
                        }
                        return node.nodeName === 'th' || node.nodeName === 'td';
                    }).map((cellElement) => {
                        const textNode = findTextNode(cellElement);
                        return (textNode !== null) ? textNode.value : null;
                    });

                    // We should have at least 2 cells (Role + IGN)
                    if (cellElements.length < 2) {
                        return result;
                    }
                    // Makes sure we have actual data in our cells
                    // No null, no '---' and the like
                    if (cellElements[0] === null
                        || cellElements[0].indexOf('-') === 0
                        || cellElements[1] === null
                        || cellElements[1].indexOf('-') === 0
                    ) {
                        return result;
                    }

                    result.push([
                        cellElements[0],
                        cellElements[1],
                    ]);

                    return result;
                }, []);
            }

            for (const [role, player] of slots) {
                // Tries to find the player's matching User
                /** @type {User} user */
                const user = this._data.users.find((user) => user.aliasesIncludes(player));

                // If we couldn't find it, adds the player name into our unknown list
                if (! user) {
                    if (! this._data.unknownPlayers.includes(player)) {
                        this._data.unknownPlayers.push(player);
                    }
                    continue;
                }

                user.signupCount++;
            }
        }

        return processedSubmissionCount;
    }

    /**
     * Returns collected data
     *
     * @return {Object}
     */
    getData() {
        return this._data;
    }

    /**
     * Persists collected data inside a JSON file
     *
     * @return {Promise<void>}
     */
    async loadData() {
        let json;
        try {
            await this._checkFilepath(this._filepath);
            const data = fs.readFileSync(this._filepath);

            json = JSON.parse(data.toString());
        } catch (error) {
            console.error(`Failed to load data from "${this._filepath}"`);
            this._debug(error);
        }

        if (! json) {
            return;
        }

        this._data.processedAARIds = json.processedAARCommentIds;
        this._data.excludedRedditIds = json.excludedRedditIds;
        this._data.unknownPlayers = json.unknownPlayers;
        this._data.users = json.users.map((userData) => {
            return User.createFromJson(userData);
        });
    }

    /**
     * Persists collected data inside a JSON file
     *
     * @return {Promise<void>}
     */
    async saveData() {
        await this._checkFilepath(this._filepath);

        const json = {
            processedAARCommentIds: this.getData().processedAARCommentIds,
            excludedRedditIds: this.getData().excludedRedditIds,
            unknownPlayers: this.getData().unknownPlayers,
            users: this.getData().users.map(user => user.toJSON()),
        };

        fs.writeFileSync(
            this._filepath,
            JSON.stringify(json)
        );
    }

    /**
     * Returns an API instance associated to the given subreddit
     *
     * @private
     * @return {Subreddit}
     * @private
     */
    async _getSubreddit() {
        // Creates API instance if needed
        if (this._subreddit === null) {
            const api = await snoowrap.fromApplicationOnlyAuth({
                userAgent: `MisfitCrawler/${packageJson.version} (by /u/MaevisFR)`,
                clientId: this._clientId,
                clientSecret: this._clientSecret,
                deviceId: 'DO_NOT_TRACK_THIS_DEVICE',
                grantType: 'client_credentials',
                permanent: true,
            });

            this._subreddit = api.getSubreddit(this._subredditName);
        }

        return this._subreddit;
    }

    /**
     * Checks if the given filepath is accessible, readable and writable
     *
     * @param {String} filepath
     * @return {Promise<void>}
     * @throws {Error}
     * @private
     */
    async _checkFilepath(filepath) {
        try {
            const fileFlags = fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK;
            fs.accessSync(filepath, fileFlags);
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`${filepath} does not exist or is not readable/writable`);
        }
    }

    /**
     *
     * @param {...*} data
     * @private
     */
    _debug(data) {
        if (process.env.DEBUG !== 'true') {
            return;
        }

        console.log(...arguments);
    }
}

module.exports = Crawler;
