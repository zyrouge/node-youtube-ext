import { playlistInfo } from "../src";

const query =
    "https://www.youtube.com/playlist?list=PLzkuLC6Yvumv_Rd5apfPRWEcjf9b1JRnq&index=1";

const start = async () => {
    const result = await playlistInfo(query);
    console.log(JSON.stringify(result, null, 4));
};

start();
