export interface BenchmarkTaskResult {
    success: boolean;
    time: number;
}

export const BenchmarkTaskNames = [
    "search",
    "video",
    "playlist",
    "channel",
    "download",
] as const;

export type BenchmarkTaskNameType = (typeof BenchmarkTaskNames)[number];

export type BenchmarkTasks = Partial<
    Record<BenchmarkTaskNameType, () => Promise<void>>
>;

export type BenchmarkTasksResult = Partial<
    Record<BenchmarkTaskNameType, BenchmarkTaskResult>
>;

export interface Benchmarkable {
    name: string;
    tasks: BenchmarkTasks;
}

export const benchmark = async (
    name: string,
    tasks: BenchmarkTasks
): Promise<BenchmarkTasksResult> => {
    const result: BenchmarkTasksResult = {};
    for (const x of BenchmarkTaskNames) {
        const fn = tasks[x];
        if (!fn) continue;
        let success: boolean;
        let time: number;
        const started = Date.now();
        try {
            await fn();
            time = Date.now() - started;
            success = true;
        } catch (err) {
            time = Date.now() - started;
            success = false;
            console.error(`${name}/${x}: ${err}`);
        }
        console.log(`${name}/${x}: ${success ? "Pass" : "Fail"} (${time}ms)`);
        result[x] = { success, time };
    }
    return result;
};
