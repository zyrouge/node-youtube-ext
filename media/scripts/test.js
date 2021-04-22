const fs = require("fs");
const path = require("path");
const util = require("util");

const root = path.resolve(__dirname, "..", "..");
const sleep = util.promisify(setTimeout);

const start = async () => {
    process.env.NODE_ENV = "test";

    const examples = path.join(root, "examples");
    for (const pth of fs.readdirSync(examples).filter(x => x.endsWith(".js"))) {
        const file = require(path.join(examples, pth));
        try {
            await file();
            console.log(`Success: ${pth.split(".")[0]}`);
        } catch (err) {
            console.log(`Failed: ${pth.split(".")[0]}`);
        }
        await sleep(2000);
    }
}

start();