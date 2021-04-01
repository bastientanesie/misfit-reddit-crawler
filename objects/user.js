'use strict';

const discordMapping = require('../discord-mapping.json') || {};

class User {
    /**
     * @param {String} name
     */
    constructor(name) {
        /**
         * @type {String}
         * @private
         */
        this._name = name;

        // Lookup the name inside our reddit-discord mapping
        if (discordMapping.hasOwnProperty(name)) {
            this._name = discordMapping[name];
        }

        /**
         * @type {Number}
         * @private
         */
        this._aarCount = 0;
    }

    /**
     * @return {String}
     */
    getName() {
        return this._name;
    }

    /**
     * @return {Number}
     */
    getAARCount() {
        return this._aarCount;
    }

    /**
     *
     */
    incrementAARCount() {
        ++this._aarCount;
    }

    /**
     * @return {String}
     */
    toString() {
        return this.getName();
    }

    /**
     * @return {Object}
     */
    toJSON(key) {
        return {
            id: key,
            name: this.getName(),
            aarCount: this.getAARCount(),
        };
    }
}

module.exports = User;
