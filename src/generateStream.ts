import type { PassThrough } from "stream";
import axios, { AxiosRequestConfig } from "axios";
import type m3u8stream from "m3u8stream";
import {
    constants,
    contentBetween,
    evalInIsolatedVM,
    mergeObj,
    parseNumberOr,
    parseQueryString,
} from "./utils";
import { VideoStream, VideoStreamEntity } from "./videoInfo";

export interface GetFormatsOptions {
    requestOptions?: AxiosRequestConfig;
    filterBy?: (
        value: VideoStreamEntity,
        index: number,
        array: VideoStreamEntity[]
    ) => boolean;
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

    let streams: VideoStreamEntity[] = [
        ...(formats.formats || []),
        ...(formats.adaptiveFormats || []),
    ].sort(
        (a, b) =>
            (a.bitrate ? +a.bitrate : 0) -
            (b.bitrate ? +b.bitrate : 0) +
            (a.audioSampleRate ? +a.audioSampleRate : 0) -
            (b.audioSampleRate ? +b.audioSampleRate : 0)
    );
    if (typeof options.filterBy === "function") {
        streams = streams.filter(options.filterBy);
    }

    let decipher: ((sig: string) => string) | undefined;
    for (const stream of streams) {
        if (formats.player?.url && stream.signatureCipher) {
            decipher ??= await getCipherFunction(formats.player.url, {
                requestOptions: options.requestOptions,
            });

            if (stream.signatureCipher) {
                const cipherData = parseQueryString(stream.signatureCipher) as {
                    url: string;
                    sp: string;
                    s: string;
                };
                stream.url = `${cipherData.url}&${cipherData.sp}=${decipher(
                    cipherData.s
                )}`;
            }
        }
        stream.isLive = !!formats.hlsManifestUrl;
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

    return streams.filter((x) => x.url);
};

export interface GetReadableStreamOptions {
    requestOptions?: AxiosRequestConfig;
    m3u8streamRequestOptions?: m3u8stream.Options["requestOptions"];
}

/**
 * Returns a YouTube stream
 *
 * **Info:** Install "m3u8stream" using ` npm install m3u8stream ` for livestream support
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
        let m3u8: typeof m3u8stream;
        try {
            m3u8 = require("m3u8stream");
        } catch (err) {
            throw new Error(
                `Couldn't access "m3u8stream". Have you installed it? (${err})`
            );
        }

        return m3u8(streams.url, {
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
    } = {}
) => {
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

    const decoder = aFunc + "\n" + bFunc;
    return evalInIsolatedVM(decoder) as (a: string) => string;
};
