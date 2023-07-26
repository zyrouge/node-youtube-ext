import axios, { AxiosRequestConfig } from "axios";
import { constants, contentBetween, mergeObj } from "./utils";

export interface VideoInfoOptions {
    requestOptions?: AxiosRequestConfig;
}

export interface VideoStreamEntity {
    itag?: number;
    url: string;
    mimeType?: string;
    bitrate?: number;
    width?: number;
    height?: number;
    initRange?: {
        start: string;
        end: string;
    };
    indexRange?: {
        start: string;
        end: string;
    };
    lastModified?: string;
    contentLength?: string;
    quality?: string;
    fps?: number;
    qualityLabel?: string;
    projectionType?: string;
    averageBitrate?: number;
    approxDurationMs?: string;
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
    targetDurationSec?: number;
    maxDvrDurationSec?: number;
    signatureCipher?: string;
    isLive?: boolean;
}

export interface VideoStream {
    expiresInSeconds: string;
    formats: VideoStreamEntity[];
    adaptiveFormats: VideoStreamEntity[];
    dashManifestUrl?: string;
    hlsManifestUrl?: string;
    player?: {
        url: string;
    };
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
    streams: VideoStream;
}

/**
 * Get full information about a YouTube video
 */
export const videoInfo = async (
    url: string,
    options: VideoInfoOptions = {}
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

    let initialData: any, initialPlayer: any;
    try {
        initialData = JSON.parse(
            contentBetween(data, "var ytInitialData = ", ";</script>")
        );
        initialPlayer = JSON.parse(
            contentBetween(
                data,
                "var ytInitialPlayerResponse = ",
                ";var meta = "
            )
        );
    } catch (err) {
        throw new Error(`Failed to parse data from webpage. (${err})`);
    }

    let contents: any[];
    try {
        contents =
            initialData?.contents?.twoColumnWatchNextResults?.results?.results
                ?.contents;
    } catch (err) {
        throw new Error(`Failed to parse contents from webpage. (${err})`);
    }

    let primary: any;
    try {
        primary = contents?.find(
            (x: any) => x?.videoPrimaryInfoRenderer
        )?.videoPrimaryInfoRenderer;
    } catch (err) {}

    let secondary: any;
    try {
        secondary = contents?.find(
            (x: any) => x?.videoSecondaryInfoRenderer
        )?.videoSecondaryInfoRenderer;
    } catch (err) {}

    const info: VideoInfo = {
        title: primary?.title?.runs[0]?.text,
        id: initialData?.currentVideoEndpoint?.watchEndpoint?.videoId,
        url:
            constants.urls.base +
            initialData?.currentVideoEndpoint?.commandMetadata
                ?.webCommandMetadata?.url,
        shortDescription: initialPlayer?.videoDetails?.shortDescription,
        description: secondary?.description?.runs
            ?.map((x: any) => x?.text)
            ?.join(""),
        channel: {
            name: secondary?.owner?.videoOwnerRenderer?.title?.runs[0]?.text,
            id: secondary?.owner?.videoOwnerRenderer?.title?.runs[0]
                ?.navigationEndpoint?.browseEndpoint?.browseId,
            url:
                constants.urls.base +
                secondary?.owner?.videoOwnerRenderer?.title?.runs[0]
                    ?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl,
            subscribers: {
                pretty: secondary?.owner?.videoOwnerRenderer
                    ?.subscriberCountText?.simpleText,
            },
            icons: secondary?.owner?.videoOwnerRenderer?.thumbnail?.thumbnails,
        },
        duration: {
            lengthSec: initialPlayer?.videoDetails?.lengthSeconds,
        },
        thumbnails: initialPlayer?.videoDetails?.thumbnail?.thumbnails,
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
            text: primary?.viewCount?.videoViewCountRenderer?.viewCount
                ?.simpleText,
            pretty: primary?.viewCount?.videoViewCountRenderer?.shortViewCount
                ?.simpleText,
        },
        published: {
            pretty: primary?.dateText?.simpleText,
            text: initialPlayer?.microformat?.playerMicroformatRenderer
                ?.publishDate,
        },
        uploaded: {
            text: initialPlayer?.microformat?.playerMicroformatRenderer
                ?.uploadDate,
        },
        keywords: initialPlayer?.videoDetails?.keywords,
        isLive: initialPlayer?.videoDetails?.isLiveContent,
        isUnlisted:
            initialPlayer?.microformat?.playerMicroformatRenderer?.isUnlisted,
        isFamilySafe:
            initialPlayer?.microformat?.playerMicroformatRenderer?.isFamilySafe,
        category:
            initialPlayer?.microformat?.playerMicroformatRenderer?.category,
        embed: initialPlayer?.microformat?.playerMicroformatRenderer?.embed,
        streams: initialPlayer?.streamingData,
    };

    const playerJsURL = data?.split('"PLAYER_JS_URL":"')[1]?.split('"')[0];
    if (playerJsURL) {
        info.streams.player = {
            url: constants.urls.base + playerJsURL,
        };
    }

    return info;
};

export default videoInfo;
