import { request } from "undici";
import { constants } from "./utils/constants";
import { mergeObj } from "./utils/common";
import { UndiciRequestOptions } from "./utils/undici";

export interface SearchOptions {
    requestOptions?: UndiciRequestOptions;
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
    icons: {
        url: string;
        width: number;
        height: number;
    }[];
    badges: string[];
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
    if (typeof terms !== "string") {
        throw new Error(constants.errors.type("terms", "string", typeof terms));
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
        },
        options
    );

    let url = constants.urls.search.base(terms);
    if (
        options.filterType &&
        constants.urls.search.filters[options.filterType]
    ) {
        url += constants.urls.search.filters[options.filterType];
    }

    let data: string;
    try {
        const resp = await request(url, options.requestOptions);
        data = await resp.body.text();
    } catch (err) {
        throw new Error(`Failed to fetch url "${url}". (${err})`);
    }

    let contents: any;
    try {
        const raw = data.substring(
            data.lastIndexOf(
                '"sectionListRenderer":{"contents":[{"itemSectionRenderer":'
            ) + 58,
            data.lastIndexOf('},{"continuationItemRenderer"')
        );
        contents = JSON.parse(raw)?.contents;
    } catch (err) {
        throw new Error(`Failed to parse contents from data. (${err})`);
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

    for (const {
        videoRenderer,
        channelRenderer,
        playlistRenderer,
    } of contents) {
        if (videoRenderer) {
            const x = videoRenderer;
            const video: SearchVideo = {
                title: x?.title?.runs[0]?.text,
                id: x?.videoId,
                url:
                    constants.urls.base +
                    x?.navigationEndpoint?.commandMetadata?.webCommandMetadata
                        ?.url,
                channel: {
                    name: x?.ownerText?.runs[0]?.text,
                    id: x?.ownerText?.runs[0]?.navigationEndpoint
                        ?.browseEndpoint?.browseId,
                    url:
                        constants.urls.base +
                        x?.ownerText?.runs[0]?.navigationEndpoint
                            ?.commandMetadata?.webCommandMetadata?.url,
                },
                duration: {
                    text: x?.lengthText?.simpleText,
                    pretty: x?.lengthText?.accessibility?.accessibilityData
                        ?.label,
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
        }

        if (channelRenderer) {
            const x = channelRenderer;
            const channel: SearchChannel = {
                name: x?.title?.simpleText,
                id: x?.channelId,
                url:
                    constants.urls.base +
                    x?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl,
                // TODO: ensure if its `videoCountText` or `subscriberCountText`
                subscribers: {
                    text: x?.videoCountText?.accessibility?.accessibilityData
                        ?.label,
                    pretty: x?.videoCountText?.simpleText,
                },
                icons: x?.thumbnail?.thumbnails,
                badges: ((x?.ownerBadges ?? []) as any[])?.reduce((pv, cv) => {
                    const name = cv?.metadataBadgeRenderer?.tooltip;
                    if (name) pv.push(name);
                    return pv;
                }, [] as string[]),
            };
            result.channels.push(channel);
        }

        if (playlistRenderer) {
            const x = playlistRenderer;
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
        }
    }

    return result;
};

export default search;
