import axios, { AxiosRequestConfig } from "axios";
import { constants, mergeObj } from "./utils";

export interface SearchOptions {
    requestOptions?: AxiosRequestConfig;
    filterType?: keyof typeof constants.urls.search.filters;
}

export interface SearchVideo {
    title: string;
    id: string;
    url: string;
    channel: {
        name: string;
        id: string;
        url: string;
    };
    duration: {
        text: string;
        pretty: string;
    };
    published: {
        pretty: string;
    };
    views: {
        text: string;
        pretty: string;
        prettyLong: string;
    };
    thumbnails: {
        url: string;
        width: number;
        height: number;
    }[];
}

export interface SearchChannel {
    name: string;
    id: string;
    url: string;
    subscribers: {
        text: string;
        pretty: string;
    };
    videoCount: string;
    icons: {
        url: string;
        width: number;
        height: number;
    }[];
}

export interface SearchPlaylist {
    name: string;
    id: string;
    url: string;
    thumbnails: {
        url: string;
        width: number;
        height: number;
    }[];
    videoCount: string;
    published: {
        pretty?: string;
    };
}

/**
 * Search for videos, channels, playlists, etc...
 */
export const search = async (terms: string, options: SearchOptions = {}) => {
    if (typeof terms !== "string")
        throw new Error(constants.err.type("terms", "string", typeof terms));

    if (typeof options !== "object")
        throw new Error(
            constants.err.type("options", "object", typeof options)
        );

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

    let url = constants.urls.search.base(terms);
    if (options.filterType) {
        const expectedFilterType = Object.keys(constants.urls.search.filters);

        if (typeof options.filterType !== "string")
            throw new Error(
                constants.err.type(
                    "filterType",
                    expectedFilterType.join(" | "),
                    typeof options.filterType
                )
            );

        if (!expectedFilterType.includes(options.filterType))
            throw new Error(
                constants.err.type(
                    "filterType",
                    expectedFilterType.join(" | "),
                    options.filterType
                )
            );

        url += constants.urls.search.filters[options.filterType];
    }

    let res: string;
    try {
        res = (
            await axios.get<string>(url, {
                ...options.requestOptions,
                responseType: "text",
            })
        ).data;
    } catch (err) {
        throw new Error(`Failed to fetch site. (${err})`);
    }

    let contents: any;
    try {
        contents = JSON.parse(
            res.substring(
                res.lastIndexOf(
                    '"sectionListRenderer":{"contents":[{"itemSectionRenderer":'
                ) + 58,
                res.lastIndexOf('},{"continuationItemRenderer"')
            )
        )?.contents;
    } catch (err) {
        throw new Error(`Failed to parse contents from script tag. (${err})`);
    }

    const result: {
        videos: SearchVideo[];
        channels: SearchChannel[];
        playlists: SearchPlaylist[];
    } = {
        videos: [],
        channels: [],
        playlists: [],
    };

    contents
        ?.filter((x: any) => x.videoRenderer)
        ?.forEach(({ videoRenderer: x }: any) => {
            const video: SearchVideo = {
                title: x?.title?.runs[0]?.text,
                id: x?.videoId,
                url:
                    constants.urls.base +
                    x?.navigationEndpoint?.commandMetadata?.webCommandMetadata
                        ?.url,
                channel: {
                    name: x?.ownerText?.runs[0]?.text,
                    id:
                        x?.ownerText?.runs[0]?.navigationEndpoint
                            ?.browseEndpoint?.browseId,
                    url:
                        constants.urls.base +
                        x?.ownerText?.runs[0]?.navigationEndpoint
                            ?.commandMetadata?.webCommandMetadata?.url,
                },
                duration: {
                    text: x?.lengthText?.simpleText,
                    pretty:
                        x?.lengthText?.accessibility?.accessibilityData?.label,
                },
                published: {
                    pretty: x?.publishedTimeText?.simpleText,
                },
                views: {
                    text: x?.viewCountText?.simpleText,
                    pretty: x?.shortViewCountText?.simpleText,
                    prettyLong:
                        x?.shortViewCountText?.accessibility?.accessibilityData
                            ?.label,
                },
                thumbnails: x?.thumbnail?.thumbnails,
            };
            result.videos.push(video);
        });

    contents
        ?.filter((x: any) => x?.channelRenderer)
        ?.forEach(({ channelRenderer: x }: any) => {
            const channel: SearchChannel = {
                name: x?.title?.simpleText,
                id: x?.channelId,
                url:
                    constants.urls.base +
                    x?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl,
                subscribers: {
                    text:
                        x?.subscriberCountText?.accessibility?.accessibilityData
                            ?.label,
                    pretty: x?.subscriberCountText?.simpleText,
                },
                videoCount:
                    x?.videoCountText?.runs[0]?.text +
                    x?.videoCountText?.runs[1]?.text,
                icons: x?.thumbnail?.thumbnails,
            };
            result.channels.push(channel);
        });

    contents
        ?.filter((x: any) => x?.playlistRenderer)
        ?.forEach(({ playlistRenderer: x }: any) => {
            const playlist: SearchPlaylist = {
                name: x?.title?.simpleText,
                id: x?.playlistId,
                url:
                    constants.urls.base +
                    x?.navigationEndpoint?.commandMetadata?.webCommandMetadata
                        ?.url,
                thumbnails:
                    x?.thumbnailRenderer?.playlistVideoThumbnailRenderer
                        ?.thumbnail?.thumbnails,
                videoCount: x?.videoCount,
                published: {
                    pretty: x?.publishedTimeText?.simpleText,
                },
            };
            result.playlists.push(playlist);
        });

    return result;
};

export default search;
