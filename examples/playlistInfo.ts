import { playlistInfo } from "../src";

const query =
    "https://www.youtube.com/playlist?list=PLNKs8mJ6MlqAx7nqsUi6tRJFDFBJxuLiV";

// has 100 videos
// const query = "https://www.youtube.com/playlist?list=PL8F6B0753B2CCA128";

const start = async () => {
    const result = await playlistInfo(query);
    console.log(JSON.stringify(result, null, 4));
};

start();
