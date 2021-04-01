import { getOptions, get, constants, getData } from "./utils";

export interface SearchOptions {
    requestOptions?: getOptions;
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

const search = async (terms: string, options: SearchOptions = {}) => {
    if (typeof terms !== "string")
        throw new Error(constants.err.type("terms", "string", typeof terms));

    if (typeof options !== "object")
        throw new Error(
            constants.err.type("options", "object", typeof options)
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

    let res: getData;
    try {
        res = await get(url, options.requestOptions);
    } catch (err) {
        throw new Error(`Failed to fetch site. (${err})`);
    }

    let script: string;
    try {
        script = res.data
            .split("var ytInitialData = ")[1]
            .split(";</script>")[0];
    } catch (err) {
        throw new Error(`Failed to scrape script tag. (${err})`);
    }

    let data: any;
    try {
        data = JSON.parse(script);
    } catch (err) {
        throw new Error(`Failed to parse script tag content. (${err}`);
    }

    let contents: unknown[];
    try {
        contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.find(
            (x: any) => x?.itemSectionRenderer
        )?.itemSectionRenderer?.contents;
    } catch (err) {
        throw new Error(`Failed to get contents from script tag. (${err}`);
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
