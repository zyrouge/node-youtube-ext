import * as ytext from "youtube-ext";
import { BenchmarkTasks } from "../benchmarker";
import { MockQueries, consumeStream } from "../mocked";

export const name = "youtube-ext";

export const tasks: BenchmarkTasks = {
    search: async () => {
        await ytext.search(MockQueries.searchText);
    },
    video: async () => {
        await ytext.videoInfo(MockQueries.videoURL);
    },
    playlist: async () => {
        await ytext.playlistInfo(MockQueries.playlistURL);
    },
    channel: async () => {
        await ytext.channelInfo(MockQueries.channelURL);
    },
    download: async () => {
        const info = await ytext.extractStreamInfo(MockQueries.videoURL);
        const formats = await ytext.getFormats(info);
        const format = formats.find((x) => x.itag === 18);
        if (!format) {
            throw new Error("No suitable video format");
        }
        const stream = await ytext.getReadableStream(format, {
            requestOptions: {},
        });
        await consumeStream(stream);
    },
};
