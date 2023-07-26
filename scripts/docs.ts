import fs from "fs/promises";
import path from "path";

const { homepage } = require("../package.json");

const start = async () => {
    const file = path.resolve(__dirname, "../docs-dist/CNAME");
    await fs.writeFile(file, homepage);
    console.log(`Wrote CNAME file to "${file}" pointing to "${homepage}"`);
};

start();
