import ytdl from "ytdl-core";
import { BenchmarkTasks } from "../benchmarker";
import { MockQueries, consumeStream } from "../mocked";

export const name = "ytdl-core";

export const tasks: BenchmarkTasks = {
    video: async () => {
        await ytdl.getBasicInfo(MockQueries.videoURL);
    },
    download: async () => {
        const stream = ytdl(MockQueries.videoURL, {
            quality: 18,
        });
        await consumeStream(stream);
    },
};
