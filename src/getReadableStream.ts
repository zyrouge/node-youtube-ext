import { PassThrough, type Readable } from "stream";
import type M3U8Stream from "m3u8stream";
import { request } from "undici";
import {
    UndiciRequestOptions,
    constants,
    mergeObj,
    requireOrThrow,
    isDashContentURL,
    isHlsContentURL,
    isLiveContentURL,
} from "./utils";

export interface GetReadableStreamOptions {
    begin?: number;
    end?: number;
    requestOptions?: UndiciRequestOptions;
    m3u8streamRequestOptions?: M3U8Stream.Options["requestOptions"];
}

/**
 * Returns a YouTube stream.
 *
 * - Install "m3u8stream" using `npm install m3u8stream` for livestream support.
 */
export const getReadableStream = async (
    stream: { url: string; contentLength?: number | string },
    options: GetReadableStreamOptions = {}
): Promise<Readable> => {
    if (typeof stream !== "object") {
        throw new Error(
            constants.errors.type("streams", "object", typeof stream)
        );
    }
    if (typeof options !== "object") {
        throw new Error(
            constants.errors.type("options", "object", typeof options)
        );
    }

    const commonRequestOptions = {
        headers: {
            "User-Agent": constants.headers.userAgent,
        },
    };
    options = mergeObj(
        {
            requestOptions: commonRequestOptions,
            m3u8streamRequestOptions: commonRequestOptions,
        },
        options
    );

    if (isDashContentURL(stream.url) || isHlsContentURL(stream.url)) {
        const m3u8stream: typeof M3U8Stream = requireOrThrow("m3u8stream");
        let begin = options.begin;
        if (typeof begin === "undefined" && isLiveContentURL(stream.url)) {
            begin = Date.now();
        }
        return m3u8stream(stream.url, {
            begin,
            requestOptions: options.m3u8streamRequestOptions,
        });
    }

    let contentLength =
        typeof stream.contentLength === "string"
            ? parseInt(stream.contentLength)
            : stream.contentLength;
    let streamURL = stream.url;
    if (typeof options.begin === "number") {
        streamURL += `&begin=${options.begin}`;
    }
    const output = new PassThrough();
    let received = 0;
    const requestData = async (): Promise<void> => {
        mergeObj(options.requestOptions, {
            headers: {
                range: `bytes=${received}-${contentLength ?? ""}`,
            },
        });
        const resp = await request(streamURL, options.requestOptions);
        if (typeof resp.headers["content-length"] === "string") {
            contentLength = parseInt(resp.headers["content-length"]!);
        }
        resp.body.pause();
        resp.body.on("data", (data) => {
            received += data.length;
        });
        resp.body.pipe(output, { end: false });
        resp.body.once("end", (): void => {
            if (output.destroyed) return;
            if (received < (contentLength ?? -1)) {
                requestData();
                return;
            }
            output.push(null);
        });
    };
    requestData();
    return output;
};
