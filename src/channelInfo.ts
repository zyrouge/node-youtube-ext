import { request } from "undici";
import { cookieJar } from "./cookies";
import {
    UndiciRequestOptions,
    assertUndiciOkResponse,
    constants,
    contentBetween,
    mergeObj,
    parseYoutubeKeywords,
} from "./utils";

export interface ChannelInfoOptions {
    requestOptions?: UndiciRequestOptions;
    includeVideos?: boolean;
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
    rssUrl: string;
    vanityUrl: string;
    description: string;
    subscribers: {
        pretty: string;
        text: string;
    };
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
    videos: ChannelVideo[];
    unlisted: boolean;
    familySafe: boolean;
}

/**
 * Get full information about a YouTube channel.
 */
export const channelInfo = async (
    url: string,
    options: ChannelInfoOptions = {}
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
            includeVideos: false,
        },
        options
    );
    if (!url.startsWith("http")) {
        url = constants.urls.channel.base(url);
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

    let initialData: any;
    try {
        const raw = contentBetween(data, "var ytInitialData = ", ";</script>");
        initialData = JSON.parse(raw);
    } catch (err) {
        throw new Error(`Failed to parse data from webpage. (${err})`);
    }

    const channel: ChannelInfo = {
        name: initialData?.metadata?.channelMetadataRenderer?.title,
        id: initialData?.metadata?.channelMetadataRenderer?.externalId,
        url: initialData?.metadata?.channelMetadataRenderer?.channelUrl,
        rssUrl: initialData?.metadata?.channelMetadataRenderer?.rssUrl,
        vanityUrl:
            initialData?.microformat?.microformatDataRenderer?.vanityChannelUrl,
        description:
            initialData?.metadata?.channelMetadataRenderer?.description,
        subscribers: {
            pretty: initialData?.header?.c4TabbedHeaderRenderer
                ?.subscriberCountText?.simpleText,
            text: initialData?.header?.c4TabbedHeaderRenderer
                ?.subscriberCountText?.accessibility?.accessibilityData?.label,
        },
        banner: initialData?.header?.c4TabbedHeaderRenderer?.banner?.thumbnails,
        tvBanner:
            initialData?.header?.c4TabbedHeaderRenderer?.tvBanner?.thumbnails,
        mobileBanner:
            initialData?.header?.c4TabbedHeaderRenderer?.mobileBanner
                ?.thumbnails,
        badges: initialData?.header?.c4TabbedHeaderRenderer?.badges
            ?.map((x: any) => x?.metadataBadgeRenderer?.tooltip)
            ?.filter((x: string) => x),
        thumbnails:
            initialData?.metadata?.channelMetadataRenderer?.avatar?.thumbnails,
        tags: parseYoutubeKeywords(
            initialData?.metadata?.channelMetadataRenderer?.keywords ?? ""
        ),
        videos: [],
        unlisted: initialData?.microformat?.microformatDataRenderer?.unlisted,
        familySafe:
            initialData?.metadata?.channelMetadataRenderer?.isFamilySafe,
    };

    if (options.includeVideos) {
        initialData?.contents?.twoColumnBrowseResultsRenderer?.tabs
            ?.find((x: any) => x?.tabRenderer?.title === "Home")
            ?.tabRenderer?.content?.sectionListRenderer?.contents?.find(
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
                                (x: any) =>
                                    x?.thumbnailOverlayTimeStatusRenderer
                            )?.thumbnailOverlayTimeStatusRenderer?.text
                                ?.simpleText,
                            text: x?.thumbnailOverlays?.find(
                                (x: any) =>
                                    x?.thumbnailOverlayTimeStatusRenderer
                            )?.thumbnailOverlayTimeStatusRenderer?.text
                                ?.accessibility?.accessibilityData?.label,
                        },
                        views: {
                            pretty: x?.shortViewCountText?.simpleText,
                            text: x?.shortViewCountText?.accessibility
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
    }

    return channel;
};

export default channelInfo;
