import axios, { AxiosRequestConfig } from "axios";
import { constants, contentBetween, mergeObj } from "./utils";
import { VideoStream } from "./videoInfo";

export interface ExtractStreamInfoOptions {
    requestOptions?: AxiosRequestConfig;
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
        throw new Error(constants.err.type("url", "string", typeof url));
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

    if (!url.startsWith("http")) {
        url = constants.urls.video.base(url);
    }

    let data: string;
    try {
        const resp = await axios.get<string>(url, {
            ...options.requestOptions,
            responseType: "text",
        });
        data = resp.data;
    } catch (err) {
        throw new Error(`Failed to fetch url "${url}". (${err})`);
    }

    let streamingData: any;
    try {
        const streamingDataRaw =
            contentBetween(data, '"streamingData":', "}]},") + "}]}";
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
