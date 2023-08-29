import ytsr from "ytsr";
import { BenchmarkTasks } from "../benchmarker";
import { MockQueries } from "../mocked";

export const name = "ytsr";

export const tasks: BenchmarkTasks = {
    search: async () => {
        await ytsr(MockQueries.searchText);
    },
};
