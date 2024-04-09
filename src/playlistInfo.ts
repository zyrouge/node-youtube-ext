import { request } from "undici";
import { cookieJar } from "./cookies";
import {
    UndiciRequestOptions,
    assertUndiciOkResponse,
    constants,
    contentBetween,
    mergeObj,
} from "./utils";

export interface PlaylistInfoOptions {
    requestOptions?: UndiciRequestOptions;
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

    const id = url.match(constants.urls.playlist.getIdRegex)?.[2] ?? url;
    if (!url.startsWith("http")) {
        url = constants.urls.playlist.base(id);
    }

    let data: string;
    try {
        const resp = await request(url, options.requestOptions);
        assertUndiciOkResponse(resp);
        data = await resp.body.text();
        cookieJar.utilizeResponseHeaders(resp.headers);
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
            const video = parsePlaylistVideo(playlistVideoRenderer);
            playlist.videos.push(video);
        }
    }

    try {
        const initialContinuationToken = contentBetween(
            data,
            '"continuationCommand":{"token":"',
            '","'
        );
        const innerTubeRaw = contentBetween(
            data,
            '"INNERTUBE_API_KEY":',
            ',"INNERTUBE_CONTEXT":'
        );
        const { INNERTUBE_API_KEY, INNERTUBE_CLIENT_VERSION } = JSON.parse(
            '{"INNERTUBE_API_KEY":' + innerTubeRaw + "}"
        );
        let continuationToken: string | undefined = initialContinuationToken;
        while (continuationToken) {
            const resp = await request(
                constants.urls.playlist.continuation(INNERTUBE_API_KEY),
                {
                    ...options.requestOptions,
                    method: "POST",
                    body: JSON.stringify({
                        continuation: continuationToken,
                        context: {
                            client: {
                                utcOffsetMinutes: 0,
                                gl: "US",
                                hl: "en",
                                clientName: "WEB",
                                clientVersion: INNERTUBE_CLIENT_VERSION,
                            },
                            user: {},
                            request: {},
                        },
                    }),
                }
            );
            assertUndiciOkResponse(resp);
            const data = (await resp.body.json()) as any;
            continuationToken = undefined;
            for (const x of data?.onResponseReceivedActions ?? []) {
                for (const {
                    playlistVideoRenderer,
                    continuationItemRenderer,
                } of x?.appendContinuationItemsAction?.continuationItems) {
                    if (playlistVideoRenderer) {
                        const video = parsePlaylistVideo(playlistVideoRenderer);
                        playlist.videos.push(video);
                    }
                    if (continuationItemRenderer) {
                        const nextContinuationToken: string | undefined =
                            continuationItemRenderer?.continuationEndpoint
                                ?.continuationCommand?.token as
                                | string
                                | undefined;
                        continuationToken = nextContinuationToken;
                    }
                }
            }
        }
    } catch (err) {}

    return playlist;
};

export default playlistInfo;

const parsePlaylistVideo = (x: any) => {
    const video: PlaylistVideo = {
        title: x?.title?.runs[0]?.text,
        id: x?.videoId,
        url:
            constants.urls.base +
            x?.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url,
        channel: {
            name: x?.shortBylineText?.runs[0]?.text,
            id: x?.shortBylineText?.runs[0]?.navigationEndpoint?.commandMetadata
                ?.webCommandMetadata?.url,
            url:
                constants.urls.base +
                x?.shortBylineText?.runs[0]?.navigationEndpoint?.browseEndpoint
                    ?.browseId,
        },
        thumbnails: x?.thumbnail?.thumbnails,
        duration: {
            pretty: x?.lengthText?.simpleText,
            text: x?.lengthText?.accessibility?.accessibilityData?.label,
            lengthSec: x?.lengthSeconds,
        },
    };
    return video;
};
