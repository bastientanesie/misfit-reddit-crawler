'use strict';

const snoowrap = require('snoowrap');
const fs = require('fs');
const path = require('path');
const packageJson = require(path.join(__dirname, '..', 'package.json'));
const User = require('./user');

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
         * @type {{processedAARCommentIds: String[], excludedRedditIds: String[], users: User[]}}
         * @private
         */
        this._data = {
            /** IDs of AAR comments that have been processed */
            processedAARCommentIds: [],
            /** Reddit usernames excluded from our data */
            excludedRedditIds: [],
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
