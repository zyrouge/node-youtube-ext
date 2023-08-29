import axios, { AxiosRequestConfig } from "axios";
import { constants, contentBetween, mergeObj } from "./utils";

export interface PlaylistInfoOptions {
    requestOptions?: AxiosRequestConfig;
}

export interface PlaylistVideo {
    title: string;
    id: string;
    url: string;
    channel: {
        name: string;
        id: string;
        url: string;
    };
    thumbnails: {
        url: string;
        width: number;
        height: number;
    }[];
    duration: {
        pretty: string;
        text: string;
        lengthSec: string;
    };
}

export interface PlaylistInfo {
    title: string;
    id: string;
    url: string;
    description: string;
    videos: PlaylistVideo[];
    thumbnails: {
        url: string;
        width: number;
        height: number;
    }[];
}

/**
 * Get full information about a YouTube playlist.
 */
export const playlistInfo = async (
    url: string,
    options: PlaylistInfoOptions = {}
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

    const id = url.match(constants.urls.playlist.getIdRegex)?.[2] ?? url;
    if (!url.startsWith("http")) {
        url = constants.urls.playlist.base(id);
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

    let initialDataRaw: string;
    try {
        initialDataRaw = contentBetween(
            data,
            "var ytInitialData = ",
            ";</script>"
        );
    } catch (err) {
        throw new Error(`Failed to parse data from webpage. (${err})`);
    }

    let contents: any;
    try {
        const raw = initialDataRaw.substring(
            initialDataRaw.lastIndexOf(
                '"playlistVideoListRenderer":{"contents":'
            ) + 40,
            initialDataRaw.lastIndexOf('],"playlistId"') + 1
        );
        contents = JSON.parse(raw);
    } catch (err) {
        throw new Error(`Failed to parse contents from data. (${err})`);
    }

    let microformat: any;
    try {
        const raw = initialDataRaw.substring(
            initialDataRaw.lastIndexOf('"microformat":') + 14,
            initialDataRaw.lastIndexOf(',"sidebar"')
        );
        microformat = JSON.parse(raw);
    } catch (err) {
        throw new Error(`Failed to parse micro-formats from data. (${err})`);
    }

    const playlist: PlaylistInfo = {
        title: microformat?.microformatDataRenderer?.title,
        id,
        url: microformat?.microformatDataRenderer?.urlCanonical,
        description: microformat?.microformatDataRenderer?.description,
        videos: [],
        thumbnails: microformat?.microformatDataRenderer?.thumbnail?.thumbnails,
    };

    for (const { playlistVideoRenderer } of contents) {
        if (playlistVideoRenderer) {
            const x = playlistVideoRenderer;
            const video: PlaylistVideo = {
                title: x?.title?.runs[0]?.text,
                id: x?.videoId,
                url:
                    constants.urls.base +
                    x?.navigationEndpoint?.commandMetadata?.webCommandMetadata
                        ?.url,
                channel: {
                    name: x?.shortBylineText?.runs[0]?.text,
                    id: x?.shortBylineText?.runs[0]?.navigationEndpoint
                        ?.commandMetadata?.webCommandMetadata?.url,
                    url:
                        constants.urls.base +
                        x?.shortBylineText?.runs[0]?.navigationEndpoint
                            ?.browseEndpoint?.browseId,
                },
                thumbnails: x?.thumbnail?.thumbnails,
                duration: {
                    pretty: x?.lengthText?.simpleText,
                    text: x?.lengthText?.accessibility?.accessibilityData
                        ?.label,
                    lengthSec: x?.lengthSeconds,
                },
            };
            playlist.videos.push(video);
        }
    }

    return playlist;
};

export default playlistInfo;
