# misfit-reddit-crawler

A simple crawler used by [the Misfit Company](https://www.reddit.com/r/The_Misfit_Company/) to compile some stats about our activity on Reddit.

## Installation

Copy the config files and edit them as you see fit:

```shell
cp .env.dist .env
cp discord-mapping.json.dist discord-mapping.json
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

## Discord-Reddit mapping

The `discord-mapping.json` file is used to map Reddit usernames to Discord accounts. For instance:

```json
{
    "NamSualk": "Klausman"
}
```

The _key_ `NamSualk` is the Reddit username, while the _value_ `Klausman` is the Discord account. One line per account.

## Reddit app registration

If you don't have one already, [create an app on Reddit](https://www.reddit.com/prefs/apps):
- type a name
- select `script`
- put a dummy redirect uri like `http://localhost/oauth`
  
Then put your app's ID and secret into the `.env` file.

## Usefull links

- [Misfit Company's Discord server](https://discord.gg/ktvBnYrWHE)
- [snoowrap documentation](https://not-an-aardvark.github.io/snoowrap/index.html)
- [Reddit API documentation](https://www.reddit.com/dev/api/)
