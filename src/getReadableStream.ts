import type { Readable } from "stream";
import type M3U8Stream from "m3u8stream";
import { request } from "undici";
import { constants } from "./utils/constants";
import { mergeObj, requireOrThrow } from "./utils/common";
import { isDashContentURL, isHlsContentURL } from "./utils/youtube";
import { UndiciRequestOptions } from "./utils/undici";

export interface GetReadableStreamOptions {
    requestOptions?: UndiciRequestOptions;
    m3u8streamRequestOptions?: M3U8Stream.Options["requestOptions"];
}

/**
 * Returns a YouTube stream.
 *
 * **Info:** Install "m3u8stream" using `npm install m3u8stream` for livestream support.
 */
export const getReadableStream = async (
    stream: { url: string },
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

    options = mergeObj(
        {
            requestOptions: {
                headers: {
                    "User-Agent": constants.headers.userAgent,
                },
            },
            m3u8streamRequestOptions: {
                headers: {
                    "User-Agent": constants.headers.userAgent,
                },
            },
        },
        options
    );

    if (isDashContentURL(stream.url) || isHlsContentURL(stream.url)) {
        const m3u8stream: typeof M3U8Stream = requireOrThrow("m3u8stream");
        return m3u8stream(stream.url, {
            requestOptions: options.m3u8streamRequestOptions,
        });
    }

    const resp = await request(stream.url, options.requestOptions);
    return resp.body;
};
