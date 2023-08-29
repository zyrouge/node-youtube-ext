import {
    BenchmarkTaskNameType,
    BenchmarkTaskResult,
    BenchmarkTasks,
    benchmark,
} from "./benchmarker";
import * as ytext from "./packages/youtube-ext";
import * as youtubeSr from "./packages/youtube-sr";
import * as ytdl from "./packages/ytdl-core";
import * as ytsr from "./packages/ytsr";
import * as ytpl from "./packages/ytpl";

export const start = async () => {
    const packages: Record<string, BenchmarkTasks> = {
        [ytext.name]: ytext.tasks,
        [youtubeSr.name]: youtubeSr.tasks,
        [ytdl.name]: ytdl.tasks,
        [ytsr.name]: ytsr.tasks,
        [ytpl.name]: ytpl.tasks,
    };
    const results: Partial<
        Record<
            BenchmarkTaskNameType,
            {
                name: string;
                result: BenchmarkTaskResult;
            }[]
        >
    > = {};
    for (const [name, tasks] of recordEntries(packages)) {
        const result = await benchmark(name, tasks);
        for (const [x, y] of partialRecordEntries(result)) {
            if (!y.success) continue;
            results[x] ??= [];
            results[x]!.push({
                name,
                result: y,
            });
        }
    }
    console.log("Results:");
    for (const [k, x] of partialRecordEntries(results)) {
        const sorted = x.sort((a, b) => a.result.time - b.result.time);
        console.log(
            ` * ${k}: ${sorted
                .map((x) => `${x.name} (${x.result.time}ms)`)
                .join(" < ")}`
        );
    }
};

start();

function recordEntries<K extends string | number | symbol, V>(
    record: Record<K, V>
) {
    return Object.entries(record) as [K, V][];
}

function partialRecordEntries<K extends string | number | symbol, V>(
    record: Partial<Record<K, V>>
) {
    return Object.entries(record) as [K, V][];
}
