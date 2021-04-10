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

    const id = constants.urls.playlist.baseUrlRegex.test(url)
        ? url.match(constants.urls.playlist.getIdRegex)?.[2] || url
        : url;
    if (!url.startsWith("http")) url = constants.urls.playlist.base(id);

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

    let contents: any;
    try {
        contents = JSON.parse(
            script.match(
                /"playlistVideoListRenderer":{"contents":(.*),"playlistId".*"targetId"/
            )?.[1] || ""
        );
    } catch (err) {
        throw new Error(`Failed to parse contents from script tag. (${err}`);
    }

    let microformat: any;
    try {
        microformat = JSON.parse(
            script.match(/"microformat":(.*),"sidebar"/)?.[1] || ""
        );
    } catch (err) {
        throw new Error(`Failed to parse contents from script tag. (${err}`);
    }

    const playlist: PlaylistInfo = {
        title: microformat?.microformatDataRenderer?.title,
        id,
        url: microformat?.microformatDataRenderer?.urlCanonical,
        description: microformat?.microformatDataRenderer?.description,
        videos: [],
        thumbnails: microformat?.microformatDataRenderer?.thumbnail?.thumbnails,
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
