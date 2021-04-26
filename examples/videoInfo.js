const { videoInfo } = require("../dist");

const query = "https://www.youtube.com/watch?v=iUnobJp3eH0";

const main = async () => {
    try {
        const info = await videoInfo(query);
        console.log(JSON.stringify(info, null, 4));
    } catch (err) {
        if (process.env.NODE_ENV !== "test") return console.log(`No result were found for ${query} (${err})`);
        throw err;
    }
}

module.exports = main;

if (process.env.NODE_ENV !== "test") main();