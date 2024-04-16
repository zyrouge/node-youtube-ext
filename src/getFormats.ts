import type NodeVM from "vm";
import type OhMyVm from "@ohmyvm/vm";
import type IsolatedVM from "isolated-vm";
import { request } from "undici";
import { VideoStream, VideoFormat } from "./videoInfo";
import { cookieJar } from "./cookies";
import {
    UndiciRequestOptions,
    assertUndiciOkResponse,
    constants,
    contentBetween,
    isModuleInstalled,
    mergeObj,
    parseNumberOr,
    parseQueryString,
    requireOrThrow,
} from "./utils";

export type GetFormatsEvaluator =
    | "auto"
    | "eval"
    | "vm"
    | "isolated-vm"
    | "ohmyvm"
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
    requestOptions?: UndiciRequestOptions;
    filterBy?: (value: VideoFormat) => boolean;
    evaluator?: GetFormatsEvaluator;
}

/**
 * Generates Stream URL(s).
 *
 * Always use this to get streams before getting readable streams!
 */
export const getFormats = async (
    stream: VideoStream,
    options: GetFormatsOptions = {}
) => {
    if (typeof stream !== "object") {
        throw new Error(
            constants.errors.type("formats", "object", typeof stream)
        );
    }
    if (typeof options !== "object") {
        throw new Error(
            constants.errors.type("options", "object", typeof options)
        );
    }

    options = mergeObj(
        {
            requestOptions: {
                headers: {
                    "User-Agent": constants.headers.userAgent,
                    Cookie: cookieJar.cookieHeaderValue(),
                },
            },
        },
        options
    );

    const resolved: VideoFormat[] = [];

    let directFormats = [
        ...(stream.formats || []),
        ...(stream.adaptiveFormats || []),
    ].sort(
        (a, b) =>
            (a.bitrate ? +a.bitrate : 0) -
            (b.bitrate ? +b.bitrate : 0) +
            (a.audioSampleRate ? parseInt(a.audioSampleRate) : 0) -
            (b.audioSampleRate ? parseInt(b.audioSampleRate) : 0)
    );
    if (typeof options.filterBy === "function") {
        directFormats = directFormats.filter(options.filterBy);
    }

    let decipher: GetFormatsEvaluatorResult | undefined;
    try {
        for (const x of directFormats) {
            if (!(options.filterBy?.(x) ?? true)) {
                continue;
            }
            if (stream.player?.url && x.signatureCipher) {
                decipher ??= await getCipherFunction(stream.player.url, {
                    requestOptions: options.requestOptions,
                });
                const cipherData = parseQueryString(x.signatureCipher) as {
                    url: string;
                    sp: string;
                    s: string;
                };
                x.url = `${cipherData.url}&${cipherData.sp}=${decipher.decoder(
                    cipherData.s
                )}`;
                x.__decoded = true;
            }
            // not really sure about this.
            if (x.url?.startsWith("https://")) {
                x.__decoded = true;
            }
            resolved.push(x);
        }
        decipher?.dispose();
    } catch (err) {
        if (decipher && !decipher.isDisposed()) {
            decipher.dispose();
        }
        throw err;
    }

    if (stream.hlsManifestUrl) {
        const hlsResp = await request(
            stream.hlsManifestUrl,
            options.requestOptions
        );
        assertUndiciOkResponse(hlsResp);
        const hlsData = await hlsResp.body.text();
        cookieJar.utilizeResponseHeaders(hlsResp.headers);

        const hlsStreams = hlsData.matchAll(
            /#EXT-X-STREAM-INF:([^\n]*)\n([^\n]+)/g
        );
        for (const x of hlsStreams) {
            const [, tagsRaw, url] = x;
            if (!url) continue;

            const tags: Record<string, string> = {};
            if (tagsRaw) {
                for (const x of tagsRaw.matchAll(/(\w+)=([^,\n]+)/g)) {
                    const [, k, v] = x;
                    if (k && v) {
                        tags[k] = v;
                    }
                }
            }

            const codecs = tags["CODECS"];
            const resolution = tags["RESOLUTION"]?.split("x") ?? [];

            resolved.push({
                itag: parseNumberOr(url.match(/itag\/(\d+)\//)?.[1], 0),
                url,
                mimeType: codecs ? `codes=${codecs[1]}` : "",
                contentLength: tags["BANDWIDTH"] ?? "0",
                fps: parseNumberOr(tags["RATE"], 0),
                height: parseNumberOr(resolution[1], 0),
                width: parseNumberOr(resolution[0], 0),
                __decoded: true,
            });
        }
    }

    return resolved;
};

const getCipherFunction = async (
    url: string,
    options: {
        requestOptions?: UndiciRequestOptions;
        evaluator?: GetFormatsEvaluator;
    } = {}
): Promise<GetFormatsEvaluatorResult> => {
    const resp = await request(url, options.requestOptions);
    assertUndiciOkResponse(resp);
    const data = await resp.body.text();

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
    } else if (
        typeof options.evaluator === "string" &&
        options.evaluator !== "auto"
    ) {
        switch (options.evaluator) {
            case "ohmyvm":
                evaluator = evalInOhMyVM;
                break;

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
        if (isModuleInstalled("@ohmyvm/vm")) {
            evaluator = evalInOhMyVM;
        } else if (isModuleInstalled("isolated-vm")) {
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
const evalInNodeVM: GetFormatsCustomEvaluator = async (code: string) => {
    const vm: typeof NodeVM = requireOrThrow("vm");
    return {
        decoder: vm.runInNewContext(code),
        isDisposed: () => true,
        dispose: () => {},
    };
};

const evalInOhMyVM: GetFormatsCustomEvaluator = async (code: string) => {
    const vm: typeof OhMyVm = requireOrThrow("@ohmyvm/vm");
    const context = new vm.OhMyVm();

    return {
        decoder: (str: string): string => {
            const src = `var __cafeBabe__ = ${code}${
                code.endsWith(";") ? "" : ";"
            }__cafeBabe__("${str}");`;

            const output = context.eval(Buffer.from(src));

            return output.replace(/"/g, "");
        },
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
