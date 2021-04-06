# misfit-reddit-crawler

A simple crawler used by [the Misfit Company](https://www.reddit.com/r/The_Misfit_Company/) to compile some stats about our activity on Reddit.

## Installation

Copy the config files and edit them as you see fit:

```shell
cp .env.dist .env
cp data.json.dist data.json
```

Install dependencies:

```shell
npm install
```

## Usage

Collect AARs data to `data.json` (defaults to all):

```shell
npm run aar [hour|day|week|month|year|all]
```

Collect signups data to `data.json` (defaults to all):

```shell
npm run signup [hour|day|week|month|year|all]
```

To sort AARs data once collected:

```shell
npm run sort-aar
```

## Data mapping

The `data.json` file is used to map player data between Reddit, Discord and signup sheets.

### `users`

This is the main piece of data used by these scripts. Here's an example:

```json
{
    "discordId": "Spamduck#8486",
    "redditId": "The_Spamduck",
    "aliases": [
        "Spamduck",
        "Spam",
        "Duck",
        "Blanketduck",
        "Canard"
    ],
    "aarCount": 0,
    "signupCount": 0
}
```

The `aliases` list contains variation of the player's name used in signup sheets.  
Because (for some unknown reasons) people like to write nicknames differently sometimes! ¯\_(ツ)_/¯

### `unknownPlayers`

This is the list of player names found in signup sheets that aren't associated to any "User" in the `data.json` file.

### `excludedRedditIds`

This is a list of Reddit username that will be ignored by the scripts.  
For instance, the user `[deleted]` is the fallback account for deleted Reddit accounts, so we don't want to take it into account.

### `processedAARCommentIds`

This contains IDs of Reddit comments already processed for AARs, in order to not count them twice.

## Reddit app registration

If you don't have one already, [create an app on Reddit](https://www.reddit.com/prefs/apps):
- type a name
- select `script`
- put a dummy redirect uri like `http://localhost/oauth`
  
Then put your app's ID and secret into the `.env` file.

## Reddit search

Reddit search API provides 3 different syntaxes:

- `plain`: it makes a dumb search as plain-text, as its name implies
- `lucene`: based on [Apache Lucene](https://lucene.apache.org), a powerfull search engine 
- `cloudsearch`: based on [AWS CloudSearch](https://aws.amazon.com/cloudsearch/), an even powerfull search engine

I'm using Lucene with [this old guide](https://www.reddit.com/wiki/search?v=844e4166-31a2-11e7-9668-0ab9a12c3b60) to make flair-based queries, since (almost) all of our reddit posts are correctly flaged with according flairs.

For instance, looking up AARs is as simple as that: `flair_text:AAR`. It'll return every post with the "AAR" flair attached to it.  
If you want the opposite, simply add a minus sign in front: `-flair_text:AAR` will give you every post without the "AAR" flair.

## Usefull links

- [Misfit Company's Discord server](https://discord.gg/ktvBnYrWHE)
- [snoowrap documentation](https://not-an-aardvark.github.io/snoowrap/index.html)
- [Reddit API documentation](https://www.reddit.com/dev/api/)
