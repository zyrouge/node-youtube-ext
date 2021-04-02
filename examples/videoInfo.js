const { videoInfo } = require("../dist");

const query = "https://www.youtube.com/watch?v=5_8MAhaoyVk";

const main = async () => {
    try {
        const info = await videoInfo(query);
        console.log(JSON.stringify(info, null, 4));
    } catch (err) {
        console.log(`No result were found for ${query}`);
    }
}

main();