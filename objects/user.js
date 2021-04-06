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

    /** @type {Number} */
    aarCount = 0;

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
        if (json.hasOwnProperty('aarCount')) {
            user.aarCount = json.aarCount;
        }

        return user;
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
            aarCount: this.aarCount,
        };
    }
}

module.exports = User;
