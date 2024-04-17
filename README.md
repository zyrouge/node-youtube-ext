# YouTube Extractor

A simple [YouTube](https://youtube.com) scraper.

[![Documentation](https://github.com/zyrouge/node-youtube-ext/actions/workflows/docs.yml/badge.svg)](https://github.com/zyrouge/node-youtube-ext/actions/workflows/docs.yml)

> ⚠️ YouTube stream data is decoded by evaluating arbitrary JavaScript code. By default, youtube-ext uses `eval` or `node:vm`. Please install [isolated-vm](https://www.npmjs.com/package/isolated-vm) or [@ohmyvm/vm](https://www.npmjs.com/package/@ohmyvm/vm) to prevent security issues.

## Features

-   Faster and Better! ([comparison](https://runkit.com/zyrouge/606dd634af4a29001a4be694))
-   Supports YouTube stream generation.
-   Supports YouTube search.
-   Supports YouTube video information.
-   Supports YouTube playlist information.
-   Supports YouTube channel information.
-   No key required!

## Installation

```bash
npm install youtube-ext
```

## Usage

```ts
const ytext = require("youtube-ext");
// or
import ytext from "youtube-ext";
// or
import { ... } from "youtube-ext";
```

Examples can be found [here](./examples)!

## Links

-   [Documentation](https://youtube-ext.js.org)
-   [NPM](https://npmjs.com/package/youtube-ext)
-   [GitHub](https://github.com/zyrouge/node-youtube-ext)

## Similar Packages

-   [youtube-dl](https://www.npmjs.com/package/youtube-dl) (Faster and better search and info scraping)
-   [ytdl-core](https://www.npmjs.com/package/ytdl-core) (YouTube Downloader)
-   [discord-player](https://www.npmjs.com/package/discord-player) (Discord music framework)
-   [discord-ytdl-core](https://www.npmjs.com/package/discord-ytdl-core) (Ytdl-core with ffmpeg args support)

## License

[MIT](./LICENSE)
