'use strict';

let userMapping = [];
try {
    const path = require('path');
    userMapping = require(path.join(__dirname, '..', 'data.json')).users;
} catch (error) {
    // console.error(error);
}

class User {
    /** @type {String} */
    redditId;

    /** @type {String} */
    discordId;

    /** @type {String[]} */
    aliases = [];

    /** @type {Number} */
    aarCount = 0;

    /** @type {Number} */
    signupCount = 0;

    /**
     * @param {String} redditId
     * @return {User}
     */
    static createFromReddit(redditId) {
        const userData = userMapping.find((user) => {
            if (! user.hasOwnProperty('redditId')) {
                return false;
            }

            return user.redditId.trim().toLowerCase() === redditId.trim().toLowerCase();
        });

        if (userData) {
            return this.createFromJson(userData);
        }

        const user = new this();
        user.redditId = redditId;

        return user;
    }

    /**
     * @param {Object} json
     * @return {User}
     */
    static createFromJson(json) {
        const user = new this();

        if (json.hasOwnProperty('redditId')) {
            user.redditId = json.redditId;
        }
        if (json.hasOwnProperty('discordId')) {
            user.discordId = json.discordId;
        }
        if (json.hasOwnProperty('aliases')) {
            user.aliases = json.aliases;
        }
        if (json.hasOwnProperty('aarCount')) {
            user.aarCount = json.aarCount;
        }
        if (json.hasOwnProperty('signupCount')) {
            user.signupCount = json.signupCount;
        }

        return user;
    }

    /**
     * Returns true if query is included in the user's aliases, and false otherwise.
     *
     * @param {String} query
     * @return {boolean}
     */
    aliasesIncludes(query) {
        const alias = this.aliases.find((alias) => {
            return query.trim().toLowerCase().includes(alias.trim().toLowerCase());
        });
        return alias !== undefined;
    }

    /**
     * @return {String}
     */
    toString() {
        if (this.redditId) {
            return this.redditId;
        }
        else if (this.discordId) {
            return this.discordId;
        }
        return 'Unknown';
    }

    /**
     * @return {Object}
     */
    toJSON() {
        return {
            discordId: this.discordId || '',
            redditId: this.redditId || '',
            aliases: this.aliases,
            aarCount: this.aarCount,
            signupCount: this.signupCount,
        };
    }
}

module.exports = User;
