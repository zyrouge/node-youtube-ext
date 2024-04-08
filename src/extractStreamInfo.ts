import { request } from "undici";
import { constants } from "./utils/constants";
import { contentBetween, contentBetweenEnds, mergeObj } from "./utils/common";
import { VideoStream } from "./videoInfo";
import { UndiciRequestOptions } from "./utils/undici";
import { cookieJar } from "./cookies";

export interface ExtractStreamInfoOptions {
    requestOptions?: UndiciRequestOptions;
}

/**
 * Get only stream information about a YouTube video.
 *
 * Note: This might break often.
 */
export const extractStreamInfo = async (
    url: string,
    options: ExtractStreamInfoOptions = {}
) => {
    if (typeof url !== "string") {
        throw new Error(constants.errors.type("url", "string", typeof url));
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

    if (!url.startsWith("http")) {
        url = constants.urls.video.base(url);
    }

    let data: string;
    try {
        const resp = await request(url, options.requestOptions);
        data = await resp.body.text();
        cookieJar.utilizeResponseHeaders(resp.headers);
    } catch (err) {
        throw new Error(`Failed to fetch url "${url}". (${err})`);
    }

    let streamingData: any;
    try {
        const streamingDataRaw = contentBetweenEnds(data, '"streamingData":', [
            ['},"heartbeatParams":{', "}"],
            ['}]},"', "}]}"],
        ]);
        streamingData = JSON.parse(streamingDataRaw);
    } catch (err) {
        throw new Error(`Failed to parse data from webpage. (${err})`);
    }

    const stream: VideoStream = streamingData;
    prepareStreamInfo(data, stream);

    return stream;
};

export const prepareStreamInfo = (data: string, stream: VideoStream) => {
    try {
        const playerJsURL = contentBetween(data, '"PLAYER_JS_URL":"', '"');
        stream.player = {
            url: constants.urls.base + playerJsURL,
        };
    } catch (err) {}
};

export default extractStreamInfo;
