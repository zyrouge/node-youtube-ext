import type { PassThrough } from "stream";
import axios, { AxiosRequestConfig } from "axios";
import type M3U8Stream from "m3u8stream";
import type NodeVM from "vm";
import type IsolatedVM from "isolated-vm";
import {
    constants,
    contentBetween,
    mergeObj,
    parseNumberOr,
    parseQueryString,
} from "./utils";
import { VideoStream, VideoStreamEntity } from "./videoInfo";

export type GetFormatsEvaluator =
    | "eval"
    | "vm"
    | "isolated-vm"
    | GetFormatsCustomEvaluator;

export type GetFormatsCustomEvaluator = (
    code: string
) => Promise<GetFormatsEvaluatorResult>;

interface GetFormatsEvaluatorResult {
    decoder: (a: string) => string;
    isDisposed: () => boolean;
    dispose: () => void;
}

export interface GetFormatsOptions {
    requestOptions?: AxiosRequestConfig;
    filterBy?: (value: VideoStreamEntity) => boolean;
    evaluator?: GetFormatsEvaluator;
}

/**
 * Generates Stream URL(s). Always use this to get streams before getting readable streams!
 */
export const getFormats = async (
    formats: VideoStream,
    options: GetFormatsOptions = {}
) => {
    if (typeof formats !== "object") {
        throw new Error(
            constants.err.type("formats", "object", typeof formats)
        );
    }
    if (typeof options !== "object") {
        throw new Error(
            constants.err.type("options", "object", typeof options)
        );
    }

    options = mergeObj(
        {
            requestOptions: {
                headers: {
                    "User-Agent": constants.headers.userAgent,
                },
            },
        },
        options
    );

    const streams: VideoStreamEntity[] = [];

    let directStreams = [
        ...(formats.formats || []),
        ...(formats.adaptiveFormats || []),
    ].sort(
        (a, b) =>
            (a.bitrate ? +a.bitrate : 0) -
            (b.bitrate ? +b.bitrate : 0) +
            (a.audioSampleRate ? parseInt(a.audioSampleRate) : 0) -
            (b.audioSampleRate ? parseInt(b.audioSampleRate) : 0)
    );
    if (typeof options.filterBy === "function") {
        directStreams = directStreams.filter(options.filterBy);
    }
    let decipher: GetFormatsEvaluatorResult | undefined;
    try {
        for (const stream of directStreams) {
            if (!(options.filterBy?.(stream) ?? true)) {
                continue;
            }
            if (formats.player?.url && stream.signatureCipher) {
                decipher ??= await getCipherFunction(formats.player.url, {
                    requestOptions: options.requestOptions,
                });

                if (stream.signatureCipher) {
                    const cipherData = parseQueryString(
                        stream.signatureCipher
                    ) as {
                        url: string;
                        sp: string;
                        s: string;
                    };
                    stream.url = `${cipherData.url}&${
                        cipherData.sp
                    }=${decipher.decoder(cipherData.s)}`;
                }
            }
            stream.isLive = !!formats.hlsManifestUrl;
            streams.push(stream);
        }
        decipher?.dispose();
    } catch (err) {
        if (decipher && !decipher.isDisposed()) {
            decipher.dispose();
        }
        throw err;
    }

    if (formats.hlsManifestUrl) {
        const { data: hlsData } = await axios.get<string>(
            formats.hlsManifestUrl,
            {
                ...options.requestOptions,
                responseType: "text",
            }
        );
        const hlsStreams = hlsData.matchAll(
            /#EXT-X-STREAM-INF:([^\n]*)\n([^\n]+)/
        );
        for (const x of hlsStreams) {
            const [, tagsRaw, url] = x;
            if (!url) continue;

            const tags: Record<string, string> = {};
            if (tagsRaw) {
                for (const x of tagsRaw.matchAll(/(\w+)=([^,\n]+)/)) {
                    const [, k, v] = x;
                    if (k && v) {
                        tags[k] = v;
                    }
                }
            }

            const codecs = tags["CODECS"];
            const resolution = tags["RESOLUTION"]?.split("x") ?? [];

            streams.push({
                itag: parseNumberOr(url.match(/itag\/(\d+)\//)?.[1], 0),
                mimeType: codecs ? `codes=${codecs[1]}` : "",
                contentLength: tags["BANDWIDTH"] ?? "0",
                fps: parseNumberOr(tags["FRAME-RATE"], 0),
                height: parseNumberOr(resolution[0], 0),
                width: parseNumberOr(resolution[1], 0),
                url,
            });
        }
    }

    return streams;
};

export interface GetReadableStreamOptions {
    requestOptions?: AxiosRequestConfig;
    m3u8streamRequestOptions?: M3U8Stream.Options["requestOptions"];
}

/**
 * Returns a YouTube stream
 *
 * **Info:** Install "m3u8stream" using `npm install m3u8stream` for livestream support
 */
export const getReadableStream = async (
    streams: { url: string },
    options: GetReadableStreamOptions = {}
) => {
    if (typeof streams !== "object") {
        throw new Error(
            constants.err.type("streams", "object", typeof streams)
        );
    }
    if (typeof options !== "object") {
        throw new Error(
            constants.err.type("options", "object", typeof options)
        );
    }

    options = mergeObj(
        {
            requestOptions: {
                headers: {
                    "User-Agent": constants.headers.userAgent,
                },
            },
        },
        options
    );

    if (streams.url.endsWith(".m3u8")) {
        const m3u8stream: typeof M3U8Stream = requireOrThrow("m3u8stream");
        return m3u8stream(streams.url, {
            requestOptions: options.m3u8streamRequestOptions,
        });
    }

    const resp = await axios.get<PassThrough>(streams.url, {
        ...options.requestOptions,
        responseType: "stream",
    });
    return resp.data;
};

const getCipherFunction = async (
    url: string,
    options: {
        requestOptions?: AxiosRequestConfig;
        evaluator?: GetFormatsEvaluator;
    } = {}
): Promise<GetFormatsEvaluatorResult> => {
    const { data } = await axios.get<string>(url, options.requestOptions);

    const aFuncStart = 'a=a.split("")';
    const aFuncEnd = "};";
    const aFuncBody = contentBetween(data, aFuncStart, aFuncEnd);
    const aFunc = "(a) => {" + aFuncStart + aFuncBody + aFuncEnd;

    const bVar = contentBetween(aFuncBody, ";", ".");
    const bVarStart = `var ${bVar}=`;
    const bVarEnd = "}};";
    const bFuncBody = contentBetween(data, bVarStart, bVarEnd);
    const bFunc = bVarStart + bFuncBody + bVarEnd;

    const decoderCode = aFunc + "\n" + bFunc;

    let evaluator: GetFormatsCustomEvaluator;
    if (typeof options.evaluator === "function") {
        evaluator = options.evaluator;
    } else if (typeof options.evaluator === "string") {
        switch (options.evaluator) {
            case "isolated-vm":
                evaluator = evalInIsolatedVM;
                break;

            case "vm":
                evaluator = evalInNodeVM;
                break;

            case "eval":
                evaluator = evalInEval;
                break;
        }
    } else {
        if (isModuleInstalled("isolated-vm")) {
            evaluator = evalInIsolatedVM;
        } else if (isModuleInstalled("vm")) {
            evaluator = evalInNodeVM;
        } else {
            evaluator = evalInEval;
        }
    }

    const result = await evaluator(decoderCode);
    return result;
};

const evalInEval: GetFormatsCustomEvaluator = async (code: string) => {
    return {
        decoder: eval(code),
        isDisposed: () => true,
        dispose: () => {},
    };
};

const requireOrThrow = <T>(moduleName: string): T => {
    try {
        const module: T = require(moduleName);
        return module;
    } catch (_) {
        throw new Error(`Couldn't access "${moduleName}". Did you install it?`);
    }
};

const isModuleInstalled = (moduleName: string) => {
    try {
        require(moduleName);
        return true;
    } catch (_) {
        return false;
    }
};

const evalInNodeVM: GetFormatsCustomEvaluator = async (code: string) => {
    const vm: typeof NodeVM = requireOrThrow("vm");
    return {
        decoder: vm.runInNewContext(code),
        isDisposed: () => true,
        dispose: () => {},
    };
};

const evalInIsolatedVM: GetFormatsCustomEvaluator = async (
    code: string,
    options: {
        memoryLimit?: number;
    } = {}
) => {
    const ivm: typeof IsolatedVM = requireOrThrow("isolated-vm");
    const isolate = new ivm.Isolate({ memoryLimit: options?.memoryLimit ?? 8 });
    const context = isolate.createContextSync();
    return {
        decoder: await context.eval(code),
        isDisposed: () => isolate.isDisposed,
        dispose: () => {
            if (isolate.isDisposed) return;
            isolate.dispose();
        },
    };
};
