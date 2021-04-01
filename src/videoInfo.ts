import { get, getOptions, getData, constants } from "./utils";

export interface VideoInfoOptions {
    requestOptions?: getOptions;
}

export interface VideoInfo {
    title: string;
    id: string;
    url: string;
    shortDescription: string;
    description: string;
    channel: {
        name: string;
        id: string;
        url: string;
        subscribers: {
            pretty: string;
        };
        icons: {
            url: string;
            width: number;
            height: number;
        }[];
    };
    duration: {
        lengthSec: string;
    };
    thumbnails: {
        url: string;
        width: number;
        height: number;
    }[];
    watermarks: {
        url: string;
        width: number;
        height: number;
    }[];
    ratings: {
        likes: {
            text: string;
            pretty: string;
        };
        dislikes: {
            text: string;
            pretty: string;
        };
    };
    views: {
        text: string;
        pretty: string;
    };
    published: {
        text: string;
        pretty: string;
    };
    uploaded: {
        text: string;
    };
    keywords: string[];
    isLive: boolean;
    isUnlisted: boolean;
    isFamilySafe: boolean;
    category: string;
    embed: {
        iframeUrl: string;
        flashUrl: string;
        height: number;
        width: number;
        flashSecureUrl: string;
    };
    availableCountries: string[];
    streams: {
        expiresInSeconds: number;
        formats: {
            itag: number;
            url: string;
            mimeType: string;
            bitrate: number;
            width: number;
            height: number;
            lastModified: string;
            contentLength?: string;
            quality: string;
            fps: number;
            qualityLabel: string;
            projectionType: string;
            averageBitrate?: number;
            audioQuality: string;
            approxDurationMs: string;
            audioSampleRate: string;
            audioChannels: number;
        }[];
        adaptiveFormats: {
            itag: number;
            url: string;
            mimeType: string;
            bitrate: number;
            width?: number;
            height?: number;
            initRange: {
                start: string;
                end: string;
            };
            indexRange: {
                start: string;
                end: string;
            };
            lastModified: string;
            contentLength: string;
            quality: string;
            fps?: number;
            qualityLabel?: string;
            projectionType: string;
            averageBitrate: number;
            approxDurationMs: string;
            colorInfo?: {
                primaries: string;
                transferCharacteristics: string;
                matrixCoefficients: string;
            };
            highReplication?: boolean;
            audioQuality?: string;
            audioSampleRate?: string;
            audioChannels?: number;
            loudnessDb?: number;
        }[];
    };
}

const videoInfo = async (url: string, options: VideoInfoOptions = {}) => {
    if (typeof url !== "string")
        throw new Error(constants.err.type("url", "string", typeof url));

    if (typeof options !== "object")
        throw new Error(
            constants.err.type("options", "object", typeof options)
        );

    if (!url.startsWith("http")) url = constants.urls.base + url;

    let res: getData;
    try {
        res = await get(url);
    } catch (err) {
        throw new Error(`Failed to fetch site. (${err})`);
    }

    let scriptInitialData: string = "";
    try {
        scriptInitialData = res.data
            .split("var ytInitialData = ")[1]
            .split(";</script>")[0];
    } catch (err) {}

    let initialData: any;
    try {
        if (scriptInitialData) initialData = JSON.parse(scriptInitialData);
    } catch (err) {
        throw new Error(`Failed to parse script tag content. (${err}`);
    }

    let scriptInitialPlayer: string = "";
    try {
        scriptInitialPlayer = res.data
            .split("var ytInitialPlayerResponse = ")[1]
            .split(";</script>")[0];
    } catch (err) {}

    let initialPlayer: any = {};
    try {
        if (scriptInitialPlayer)
            initialPlayer = JSON.parse(scriptInitialPlayer);
    } catch (err) {
        throw new Error(`Failed to parse script tag content. (${err}`);
    }

    let contents: any[];
    try {
        contents =
            initialData?.contents?.twoColumnWatchNextResults?.results?.results
                ?.contents;
    } catch (err) {
        throw new Error(`Failed to get contents from script tag. (${err}`);
    }

    let primary: any;
    try {
        primary = contents?.find((x: any) => x?.videoPrimaryInfoRenderer)
            ?.videoPrimaryInfoRenderer;
    } catch (err) {}

    let secondary: any;
    try {
        secondary = contents?.find((x: any) => x?.videoSecondaryInfoRenderer)
            ?.videoSecondaryInfoRenderer;
    } catch (err) {}

    let details: any;
    try {
        details = initialPlayer?.videoDetails;
    } catch (err) {}

    let playerMicroformat: any;
    try {
        playerMicroformat =
            initialPlayer?.microformat?.playerMicroformatRenderer;
    } catch (err) {}

    const info: VideoInfo = {
        title: primary?.title?.runs[0]?.text,
        id: initialData?.currentVideoEndpoint?.watchEndpoint?.videoId,
        url:
            constants.urls.base +
            initialData?.currentVideoEndpoint?.commandMetadata
                ?.webCommandMetadata?.url,
        shortDescription: details?.shortDescription,
        description: secondary?.description?.runs
            ?.map((x: any) => x?.text)
            ?.join(""),
        channel: {
            name: secondary?.owner?.videoOwnerRenderer?.title?.runs[0]?.text,
            id:
                secondary?.owner?.videoOwnerRenderer?.title?.runs[0]
                    ?.navigationEndpoint?.browseEndpoint?.browseId,
            url:
                constants.urls.base +
                secondary?.owner?.videoOwnerRenderer?.title?.runs[0]
                    ?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl,
            subscribers: {
                pretty:
                    secondary?.owner?.videoOwnerRenderer?.subscriberCountText
                        ?.simpleText,
            },
            icons: secondary?.owner?.videoOwnerRenderer?.thumbnail?.thumbnails,
        },
        duration: {
            lengthSec: details?.lengthSeconds,
        },
        thumbnails: details?.thumbnail?.thumbnails,
        watermarks: initialPlayer?.annotations?.find(
            (x: any) => x?.playerAnnotationsExpandedRenderer
        )?.playerAnnotationsExpandedRenderer?.featuredChannel?.watermark
            ?.thumbnails,
        ratings: {
            likes: {
                text: primary?.videoActions?.menuRenderer?.topLevelButtons?.find(
                    (x: any) =>
                        x?.toggleButtonRenderer?.defaultIcon?.iconType ===
                        "LIKE"
                )?.toggleButtonRenderer?.defaultText?.accessibility
                    ?.accessibilityData?.label,
                pretty: primary?.videoActions?.menuRenderer?.topLevelButtons?.find(
                    (x: any) =>
                        x?.toggleButtonRenderer?.defaultIcon?.iconType ===
                        "LIKE"
                )?.toggleButtonRenderer?.defaultText?.simpleText,
            },
            dislikes: {
                text: primary?.videoActions?.menuRenderer?.topLevelButtons?.find(
                    (x: any) =>
                        x?.toggleButtonRenderer?.defaultIcon?.iconType ===
                        "DISLIKE"
                )?.toggleButtonRenderer?.defaultText?.accessibility
                    ?.accessibilityData?.label,
                pretty: primary?.videoActions?.menuRenderer?.topLevelButtons?.find(
                    (x: any) =>
                        x?.toggleButtonRenderer?.defaultIcon?.iconType ===
                        "DISLIKE"
                )?.toggleButtonRenderer?.defaultText?.simpleText,
            },
        },
        views: {
            text:
                primary?.viewCount?.videoViewCountRenderer?.viewCount
                    ?.simpleText,
            pretty:
                primary?.viewCount?.videoViewCountRenderer?.shortViewCount
                    ?.simpleText,
        },
        published: {
            pretty: primary?.dateText?.simpleText,
            text: playerMicroformat?.publishDate,
        },
        uploaded: {
            text: playerMicroformat?.uploadDate,
        },
        keywords: details?.keywords,
        isLive: details?.isLiveContent,
        isUnlisted: playerMicroformat?.isUnlisted,
        isFamilySafe: playerMicroformat?.isFamilySafe,
        category: playerMicroformat?.category,
        embed: playerMicroformat?.embed,
        availableCountries: playerMicroformat?.availableCountries,
        streams: initialPlayer?.streamingData,
    };

    return info;
};

export default videoInfo;
