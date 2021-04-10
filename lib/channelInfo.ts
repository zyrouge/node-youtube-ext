import { get, getData, constants, getOptions, mergeObj } from "./utils";

export interface ChannelInfoOptions {
    requestOptions?: getOptions;
}

export interface ChannelVideo {
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
    };
    views: {
        text: string;
        pretty: string;
        simpleText: string;
    };
    published: {
        text: string;
    };
}

export interface ChannelInfo {
    name: string;
    id: string;
    url: string;
    vanityUrl: string;
    rssUrl: string;
    description: string;
    subscribers: {
        pretty: string;
        text: string;
    };
    videos: ChannelVideo[];
    thumbnails: {
        url: string;
        width: number;
        height: number;
    }[];
    banner: {
        url: string;
        width: number;
        height: number;
    }[];
    tvBanner: {
        url: string;
        width: number;
        height: number;
    }[];
    mobileBanner: {
        url: string;
        width: number;
        height: number;
    }[];
    badges: string[];
    tags: string[];
    availableCountries: string[];
    unlisted: boolean;
    familySafe: boolean;
}

/**
 * Get full information about a YouTube channel
 */
export const channelInfo = async (
    url: string,
    options: ChannelInfoOptions = {}
) => {
    if (typeof url !== "string")
        throw new Error(constants.err.type("url", "string", typeof url));

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

    if (!url.startsWith("http")) url = constants.urls.channel.base(url);

    let res: getData;
    try {
        res = await get(url, options.requestOptions);
    } catch (err) {
        throw new Error(`Failed to fetch site. (${err})`);
    }

    const script = (await res.text()).match(
        /var ytInitialData = (.*);<\/script>/
    )?.[1];
    if (!script) throw new Error("Failed to parse data from script tag.");

    let data: any;
    try {
        data = JSON.parse(script);
    } catch (err) {
        throw new Error(`Failed to parse script tag content. (${err}`);
    }

    let contents: any[];
    try {
        contents = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.find(
            (x: any) => x?.tabRenderer?.title === "Home"
        )?.tabRenderer?.content?.sectionListRenderer?.contents;
    } catch (err) {
        throw new Error(`Failed to get contents from script tag. (${err}`);
    }

    const channel: ChannelInfo = {
        name: data?.microformat?.microformatDataRenderer?.title,
        id: data?.metadata?.channelMetadataRenderer?.externalId,
        url: data?.metadata?.channelMetadataRenderer?.channelUrl,
        rssUrl: data?.microformat?.microformatDataRenderer?.rssUrl,
        vanityUrl: data?.microformat?.microformatDataRenderer?.vanityChannelUrl,
        description: data?.metadata?.channelMetadataRenderer?.description,
        subscribers: {
            pretty:
                data?.header?.c4TabbedHeaderRenderer?.subscriberCountText
                    ?.simpleText,
            text:
                data?.header?.c4TabbedHeaderRenderer?.subscriberCountText
                    ?.accessibility?.accessibilityData?.label,
        },
        banner: data?.header?.c4TabbedHeaderRenderer?.banner?.thumbnails,
        tvBanner: data?.header?.c4TabbedHeaderRenderer?.tvBanner?.thumbnails,
        mobileBanner:
            data?.header?.c4TabbedHeaderRenderer?.mobileBanner?.thumbnails,
        badges: data?.header?.c4TabbedHeaderRenderer?.badges
            ?.map((x: any) => x?.metadataBadgeRenderer?.tooltip)
            ?.filter((x: string) => x),
        videos: [],
        thumbnails:
            data?.microformat?.microformatDataRenderer?.thumbnail?.thumbnails,
        tags: data?.microformat?.microformatDataRenderer?.tags,
        availableCountries:
            data?.microformat?.microformatDataRenderer?.availableCountries,
        unlisted: data?.microformat?.microformatDataRenderer?.unlisted,
        familySafe: data?.microformat?.microformatDataRenderer?.familySafe,
    };

    contents
        ?.find(
            (x: any) =>
                x?.itemSectionRenderer?.contents[0]?.shelfRenderer?.content
                    ?.horizontalListRenderer?.items
        )
        ?.itemSectionRenderer?.contents[0]?.shelfRenderer?.content?.horizontalListRenderer?.items?.forEach(
            ({ gridVideoRenderer: x }: any) => {
                const video: ChannelVideo = {
                    title: x?.title?.simpleText,
                    id: x?.videoId,
                    url:
                        constants.urls.base +
                        x?.navigationEndpoint?.commandMetadata
                            ?.webCommandMetadata?.url,
                    channel: {
                        name: channel?.name,
                        id: channel?.id,
                        url: channel?.url,
                    },
                    thumbnails: x?.thumbnail?.thumbnails,
                    duration: {
                        pretty: x?.thumbnailOverlays?.find(
                            (x: any) => x?.thumbnailOverlayTimeStatusRenderer
                        )?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText,
                        text: x?.thumbnailOverlays?.find(
                            (x: any) => x?.thumbnailOverlayTimeStatusRenderer
                        )?.thumbnailOverlayTimeStatusRenderer?.text
                            ?.accessibility?.accessibilityData?.label,
                    },
                    views: {
                        pretty: x?.shortViewCountText?.simpleText,
                        text:
                            x?.shortViewCountText?.accessibility
                                ?.accessibilityData?.label,
                        simpleText: x?.viewCountText?.simpleText,
                    },
                    published: {
                        text: x?.publishedTimeText?.simpleText,
                    },
                };
                channel.videos.push(video);
            }
        );

    return channel;
};

export default channelInfo;
