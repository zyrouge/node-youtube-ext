import { search } from "../src";

const query = "ncs";

const start = async () => {
    const result = await search(query);
    console.log(JSON.stringify(result, null, 4));
};

start();
