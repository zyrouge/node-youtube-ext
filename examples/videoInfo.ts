import { videoInfo } from "../src";

const query = "https://www.youtube.com/watch?v=iUnobJp3eH0";

const start = async () => {
    const result = await videoInfo(query);
    console.log(JSON.stringify(result, null, 4));
};

start();
