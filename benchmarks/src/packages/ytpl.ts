import ytpl from "ytpl";
import { BenchmarkTasks } from "../benchmarker";
import { MockQueries } from "../mocked";

export const name = "ytpl";

export const tasks: BenchmarkTasks = {
    playlist: async () => {
        await ytpl(MockQueries.playlistURL);
    },
};
