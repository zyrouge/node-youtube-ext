import type m3u8stream from "m3u8stream";
import { get, constants, getOptions, mergeObj } from "./utils";
import { VideoStream, VideoStreamEntity } from "./videoInfo";

export interface FilterFormatsOptions {
    requestOptions?: getOptions;
    filterBy?: () => ReturnType<typeof filterFormats>;
}

/**
 * Filters and generates Stream URL(s). Always filter before generating streams!
 */
export const filterFormats = async (
    formats: VideoStream,
    options: FilterFormatsOptions = {}
) => {
    if (typeof formats !== "object")
        throw new Error(
            constants.err.type("formats", "object", typeof formats)
        );

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

    let streams: VideoStreamEntity[] = [
        ...(formats.formats || []),
        ...(formats.adaptiveFormats || []),
    ].sort(
        (a, b) =>
            (a.bitrate ? +a.bitrate : 0) -
            (b.bitrate ? +b.bitrate : 0) +
            (a.audioSampleRate ? +a.audioSampleRate : 0) -
            (b.audioSampleRate ? +b.audioSampleRate : 0)
    );

    if (options.filterBy) {
        if (typeof options.filterBy === "function") {
            streams = streams.filter(options.filterBy);
        } else
            throw new Error(
                constants.err.type(
                    "options.filterBy",
                    "function | undefined",
                    typeof options
                )
            );
    }

    let decodeSignature: ((sig: string) => string) | null = null;
    for (const i in streams) {
        let str = streams[i];
        if (formats.player?.url && str.signatureCipher) {
            if (!decodeSignature)
                decodeSignature = await getCipherFunction(formats.player.url, {
                    requestOptions: options.requestOptions,
                });

            const cipData: any = {};
            str.signatureCipher?.split("&")?.forEach((x) => {
                const [k, v] = x.split("=") as [keyof typeof cipData, string];
                cipData[k] = v;
            });

            str.url = `${decodeURIComponent(cipData.url)}&${
                cipData.sp
            }=${decodeSignature(decodeURIComponent(cipData.s))}`;
        }
        str.isLive = !!formats.hlsManifestUrl;
        streams[i] = str;
    }

    if (formats.hlsManifestUrl) {
        const lvstsraw = await (await get(formats.hlsManifestUrl)).text();
        const ifrstart = "EXT-X-STREAM-INF:";
        const lvstscont = lvstsraw
            .split("#")
            .filter((x) => x.startsWith(ifrstart))
            .map((x) => x.split("\n").filter((x) => x.length));

        for (const lvstr of lvstscont) {
            const ifr = lvstr[0]
                .replace(ifrstart, "")
                .split(/,(?=([^\"]*\"[^\"]*\")*[^\"]*$)/g)
                .filter((x) => x)
                .map((x) => x.split("="));

            const res = ifr.find((x) => x[0] === "RESOLUTION");
            const [width, height] = res
                ? res[1]?.split("x").map((x) => +x)
                : [0, 0];

            const fps = ifr.find((x) => x[0] === "FRAME-RATE");
            const bandwidth = ifr.find((x) => x[0] === "BANDWIDTH");
            const codecs = ifr.find((x) => x[0] === "CODECS");

            const url = lvstr[1];
            const itag = url.match(/itag\/(\d+)\//);

            streams.push({
                itag: itag ? +itag[1] : 0,
                mimeType: codecs ? `codes=${codecs[1]}` : "",
                contentLength: bandwidth ? bandwidth[1] : "0",
                fps: fps ? +fps[1] : 0,
                height,
                width,
                url,
            });
        }
    }

    return streams.filter((x) => x.url);
};

export interface getReadableStreamOptions {
    requestOptions?: getOptions;
}

/**
 * Returns a YouTube stream
 * **Info:** Install "m3u8stream" using `npm install m3u8stream` for livestream support
 */
export const getReadableStream = async (
    streams: { url: string },
    options: getReadableStreamOptions = {}
) => {
    if (typeof streams !== "object")
        throw new Error(
            constants.err.type("streams", "object", typeof streams)
        );

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

    if (streams.url.endsWith(".m3u8")) {
        let m3u8: typeof m3u8stream;
        try {
            m3u8 = require("m3u8stream");
        } catch (err) {
            throw new Error(
                `Couldn't access "m3u8stream". Have you installed it? (${err})`
            );
        }

        return m3u8(streams.url, {
            requestOptions: options.requestOptions,
        });
    }

    return get(streams.url, options.requestOptions);
};

const getCipherFunction = async (
    url: string,
    options: {
        requestOptions?: getOptions;
    } = {}
) => {
    const res = await (await get(url, options.requestOptions)).text();

    const mfuncstart = 'a=a.split("")';
    const mfuncend = "};";
    const mfunccont = res?.split(mfuncstart)[1]?.split(mfuncend)[0];
    const mfunc = "(a) => {" + mfuncstart + mfunccont + mfuncend;

    const secvarstart = "var " + mfunccont.split(".")[0]?.replace(";", "");
    const secvarend = "}};";
    const secfunccont = res?.split(secvarstart)[1].split(secvarend)[0];
    const secfunc = secvarstart + secfunccont + secvarend;

    const decoder = secfunc + "\n" + mfunc;
    return eval(decoder) as (a: string) => string;
};
