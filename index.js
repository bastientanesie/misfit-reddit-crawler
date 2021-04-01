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
    crawler.processAARActivity(timeframe).then((aarCount) => {
        console.log(`Processed: ${aarCount}`);
        return crawler.saveData();
    }).then(() => {
        console.log('OK');
        process.exit(0);
    });
}
