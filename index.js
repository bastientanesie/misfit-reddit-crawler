#!/usr/bin/env node
'use strict';

require('dotenv').config();

const action = (process.argv.length > 2)
    ? process.argv[2].substring(1)
    : null;
if (action === null) {
    console.log(`I don't know what to do.`);
    process.exit(1);
}

const Crawler = require('./objects/crawler');

const crawler = new Crawler(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.SUBREDDIT_NAME
);

if (action === 'aar') {
    const timeframe = (process.argv.length > 3)
        ? process.argv[3]
        : 'all';

    console.log('Processing AARs…');
    crawler.loadData().then(() => {
        return crawler.processAARActivity(timeframe);
    }).then((processedCount) => {
        console.log(`Processed: ${processedCount}`);
        return crawler.saveData();
    }).then(() => {
        console.log('OK');
        process.exit(0);
    });
}
else if (action === 'sort-aar') {
    const fs = require('fs');
    const filepath = `${__dirname}/data.json`;
    try {
        fs.accessSync(filepath, fs.constants.F_OK | fs.constants.R_OK);
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(`${filepath} does not exist or is not readable`);
    }
    let users = require(filepath).users;

    // Sorts by AAR count, then by name
    users.sort((a, b) => {
        const diff = b.signupCount - a.signupCount;
        if (diff !== 0) {
            return diff;
        }
        return a.redditId.localeCompare(b.redditId);
    });

    for (const user of users) {
        if (user.aliases.length > 0) {
            console.log(`${user.aliases[0]}: ${user.signupCount}`);
        } else {
            console.log(`${user.redditId}: ${user.signupCount}`);
        }
    }

    console.log(`Sorted ${users.length} users.`);
    process.exit(0);
}
else if (action === 'signup') {
    const timeframe = (process.argv.length > 3)
        ? process.argv[3]
        : 'all';

    console.log('Processing signups…');
    crawler.loadData().then(() => {
        return crawler.processSignups(timeframe);
    }).then((processedCount) => {
        console.log(`Processed: ${processedCount}`);
        return crawler.saveData();
    }).then(() => {
        console.log('OK');
        process.exit(0);
    });
}
else {
    console.log(`${action} is not implemented.`);
    process.exit(2);
}
