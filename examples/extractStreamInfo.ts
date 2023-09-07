import { extractStreamInfo, getFormats } from "../src";

const query = "https://www.youtube.com/watch?v=Sn1rJbZ8nI4";

const start = async () => {
    const result = await extractStreamInfo(query);
    console.log(JSON.stringify(result, null, 4));
};

start();
