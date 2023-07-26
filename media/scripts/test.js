const fs = require("fs");
const path = require("path");
const util = require("util");

const root = path.resolve(__dirname, "..", "..");
const sleep = util.promisify(setTimeout);

const start = async () => {
    process.env.NODE_ENV = "test";

    const examples = path.join(root, "examples");
    const success = [];
    const failed = [];

    for (const pth of fs
        .readdirSync(examples)
        .filter((x) => x.endsWith(".js"))) {
        if (pth !== "generateStream.js") continue;
        const file = require(path.join(examples, pth));
        try {
            await file();
            success.push(pth.split(".")[0]);
        } catch (err) {
            failed.push(pth.split(".")[0]);
        }
        await sleep(2000);
    }

    console.log(" ");
    console.log(`Success: ${success.length ? success.join(", ") : "-"}`);
    console.log(`Failed: ${failed.length ? failed.join(", ") : "-"}`);
};

start();
