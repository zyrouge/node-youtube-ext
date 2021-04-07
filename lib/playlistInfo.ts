import { get, getData, constants, getOptions, mergeObj } from "./utils";

export interface PlaylistInfoOptions {
    requestOptions?: getOptions;
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
 * Get full information about a YouTube playlist
 */
export const playlistInfo = async (
    url: string,
    options: PlaylistInfoOptions = {}
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

    if (!constants.urls.playlist.baseUrlRegex.test(url)) {
        const id = url.match(constants.urls.playlist.getIdRegex);
        if (id && id[2]) url = id[2];
    }

    if (!url.startsWith("http")) url = constants.urls.playlist.base(url);

    let res: getData;
    try {
        res = await get(url, options.requestOptions);
    } catch (err) {
        throw new Error(`Failed to fetch site. (${err})`);
    }

    let script: string;
    try {
        script = (await res.text())
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

    let listRenderer: any;
    try {
        listRenderer = data?.contents?.twoColumnBrowseResultsRenderer?.tabs
            ?.find((x: any) => x?.tabRenderer)
            ?.tabRenderer?.content?.sectionListRenderer?.contents?.find(
                (x: any) => x?.itemSectionRenderer
            )
            ?.itemSectionRenderer?.contents?.find(
                (x: any) => x?.playlistVideoListRenderer
            )?.playlistVideoListRenderer;
    } catch (err) {
        throw new Error(`Failed to get contents from script tag. (${err}`);
    }

    let contents: unknown[];
    try {
        contents = listRenderer?.contents;
    } catch (err) {
        throw new Error(`Failed to get contents from script tag. (${err}`);
    }

    const playlist: PlaylistInfo = {
        title: data?.microformat?.microformatDataRenderer?.title,
        id: listRenderer?.playlistId,
        url: data?.microformat?.microformatDataRenderer?.urlCanonical,
        description: data?.microformat?.microformatDataRenderer?.description,
        videos: [],
        thumbnails:
            data?.microformat?.microformatDataRenderer?.thumbnail?.thumbnails,
    };

    contents
        ?.filter((x: any) => x?.playlistVideoRenderer)
        ?.forEach(({ playlistVideoRenderer: x }: any) => {
            const video: PlaylistVideo = {
                title: x?.title?.runs[0]?.text,
                id: x?.videoId,
                url:
                    constants.urls.base +
                    x?.navigationEndpoint?.commandMetadata?.webCommandMetadata
                        ?.url,
                channel: {
                    name: x?.shortBylineText?.runs[0]?.text,
                    id:
                        x?.shortBylineText?.runs[0]?.navigationEndpoint
                            ?.commandMetadata?.webCommandMetadata?.url,
                    url:
                        constants.urls.base +
                        x?.shortBylineText?.runs[0]?.navigationEndpoint
                            ?.browseEndpoint?.browseId,
                },
                thumbnails: x?.thumbnail?.thumbnails,
                duration: {
                    pretty: x?.lengthText?.simpleText,
                    text:
                        x?.lengthText?.accessibility?.accessibilityData?.label,
                    lengthSec: x?.lengthSeconds,
                },
            };
            playlist.videos.push(video);
        });

    return playlist;
};

export default playlistInfo;
