import axios, { AxiosRequestConfig } from "axios";
import type m3u8stream from "m3u8stream";
import { constants, mergeObj } from "./utils";
import { VideoStream, VideoStreamEntity } from "./videoInfo";

export interface GetFormatsOptions {
    requestOptions?: AxiosRequestConfig;
    filterBy?: VideoStreamEntity[]["filter"];
}

/**
 * Generates Stream URL(s). Always use this to get streams before getting readable streams!
 */
export const getFormats = async (
    formats: VideoStream,
    options: GetFormatsOptions = {}
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
            streams = streams.filter(options.filterBy as any);
        } else
            throw new Error(
                constants.err.type(
                    "options.filterBy",
                    "function | undefined",
                    typeof options
                )
            );
    }

    let decodeSignature: ((sig: string) => string) | undefined;
    for (const i in streams) {
        // TODO
        let str = streams[i]!;
        if (formats.player?.url && str.signatureCipher) {
            if (!decodeSignature) {
                decodeSignature = await getCipherFunction(formats.player.url, {
                    requestOptions: options.requestOptions,
                })!;
            }

            const cipData: any = {};
            str.signatureCipher?.split("&")?.forEach((x) => {
                const [k, v] = x.split("=") as [keyof typeof cipData, string];
                cipData[k] = v;
            });

            // TODO
            str.url = `${decodeURIComponent(cipData.url)}&${
                cipData.sp
            }=${decodeSignature!(decodeURIComponent(cipData.s))}`;
        }
        str.isLive = !!formats.hlsManifestUrl;
        streams[i] = str;
    }

    if (formats.hlsManifestUrl) {
        const lvstsraw: string = (
            await axios.get<string>(formats.hlsManifestUrl, {
                ...options.requestOptions,
                responseType: "text",
            })
        ).data;
        const ifrstart = "EXT-X-STREAM-INF:";
        const lvstscont = lvstsraw
            .split("#")
            .filter((x) => x.startsWith(ifrstart))
            .map((x) => x.split("\n").filter((x) => x.length));

        for (const lvstr of lvstscont) {
            // TODO
            if (!lvstr.length) continue;
            const ifr = lvstr[0]!
                .replace(ifrstart, "")
                .split(/,(?=([^\"]*\"[^\"]*\")*[^\"]*$)/g)
                .filter((x) => x)
                .map((x) => x.split("="));

            const res = ifr.find((x) => x[0] === "RESOLUTION");
            if (!res) continue;
            const [width, height] = res[1]
                ? res[1].split("x").map((x) => parseInt(x))
                : [0, 0];

            const fps = ifr.find((x) => x[0] === "FRAME-RATE");
            const bandwidth = ifr.find((x) => x[0] === "BANDWIDTH");
            const codecs = ifr.find((x) => x[0] === "CODECS");

            // TODO
            const url = lvstr[1];
            if (!url) continue;
            const itag = url.match(/itag\/(\d+)\//);

            streams.push({
                itag: itag ? parseInt(itag[1]!) : 0,
                mimeType: codecs ? `codes=${codecs[1]}` : "",
                contentLength: bandwidth ? bandwidth[1] : "0",
                fps: fps ? parseInt(fps[1]!) : 0,
                height,
                width,
                url,
            });
        }
    }

    return streams.filter((x) => x.url);
};

export interface getReadableStreamOptions {
    requestOptions?: AxiosRequestConfig & m3u8stream.Options["requestOptions"];
}

/**
 * Returns a YouTube stream
 *
 * **Info:** Install "m3u8stream" using ` npm install m3u8stream ` for livestream support
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

    return (
        await axios.get<any>(streams.url, {
            ...options.requestOptions,
            responseType: "stream",
        })
    ).data;
};

const getCipherFunction = async (
    url: string,
    options: {
        requestOptions?: AxiosRequestConfig;
    } = {}
) => {
    const res: string = (await axios.get(url, options.requestOptions)).data;

    const mfuncstart = 'a=a.split("")';
    const mfuncend = "};";
    const mfunccont = res?.split(mfuncstart)[1]?.split(mfuncend)[0];
    if (!mfunccont) return;
    const mfunc = "(a) => {" + mfuncstart + mfunccont + mfuncend;

    // TODO
    const secvarstart =
        "var " + mfunccont.split(".")[0]?.replace(";", "") + "=";
    const secvarend = "}};";
    const secfunccont = res?.split(secvarstart)[1]?.split(secvarend)[0];
    if (!secfunccont) return;
    const secfunc = secvarstart + secfunccont + secvarend;
    console.log(secfunc);

    const decoder = secfunc + "\n" + mfunc;
    return eval(decoder) as (a: string) => string;
};
