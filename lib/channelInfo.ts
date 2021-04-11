import { get, constants, getOptions, mergeObj } from "./utils";

export interface ChannelInfoOptions {
    requestOptions?: getOptions;
}

export interface ChannelInfo {
    name: string;
    id: string;
    url: string;
    rssUrl: string;
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
    badges: string[];
    tags: string[];
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

    let res: string;
    try {
        const gres = await get(url, options.requestOptions);
        res = await gres.text();
    } catch (err) {
        throw new Error(`Failed to fetch site. (${err})`);
    }

    const script = res.substring(
        res.lastIndexOf("var ytInitialData = ") + 20,
        res.lastIndexOf("]}}};</script>") + 4
    );
    if (!script) throw new Error("Failed to parse data from script tag.");

    let channelMetadataRenderer: any = {};
    try {
        channelMetadataRenderer = JSON.parse(
            script.substring(
                script.lastIndexOf('"channelMetadataRenderer":') + 26,
                script.lastIndexOf(',"availableCountryCodes"')
            ) + "}"
        );
    } catch (err) {}

    let c4TabbedHeaderRenderer: any = {};
    try {
        c4TabbedHeaderRenderer = JSON.parse(
            script.substring(
                script.lastIndexOf('"c4TabbedHeaderRenderer":') + 25,
                script.lastIndexOf(',"headerLinks"')
            ) + "}"
        );
    } catch (err) {}

    let subscriberCountText: any = {};
    try {
        subscriberCountText = JSON.parse(
            script.substring(
                script.lastIndexOf('"subscriberCountText":') + 22,
                script.lastIndexOf(',"tvBanner"')
            )
        );
    } catch (err) {}

    const channel: ChannelInfo = {
        name: channelMetadataRenderer?.title,
        id: channelMetadataRenderer?.externalId,
        url: channelMetadataRenderer?.channelUrl,
        rssUrl: channelMetadataRenderer?.rssUrl,
        description: channelMetadataRenderer?.description,
        subscribers: {
            pretty: subscriberCountText?.simpleText,
            text: subscriberCountText?.accessibility?.accessibilityData?.label,
        },
        banner: c4TabbedHeaderRenderer?.banner?.thumbnails,
        badges: c4TabbedHeaderRenderer?.badges
            ?.map((x: any) => x?.metadataBadgeRenderer?.tooltip)
            ?.filter((x: string) => x),
        thumbnails: channelMetadataRenderer?.avatar?.thumbnails,
        tags: channelMetadataRenderer?.keywords.split(" "),
        familySafe: channelMetadataRenderer?.isFamilySafe,
    };

    return channel;
};

export default channelInfo;
