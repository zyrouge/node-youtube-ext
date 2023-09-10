export const isLiveContentURL = (url?: string) =>
    url?.includes("/yt_live_broadcast/") ?? false;

export const isDashContentURL = (url?: string) =>
    url?.includes("/dash/") ?? false;

export const isHlsContentURL = (url?: string) =>
    url?.includes("/hls_playlist/") ?? false;

export const isAudioCodec = (codec?: string) =>
    codec?.startsWith("audio/") ?? false;

export const isVideoCodec = (codec?: string) =>
    codec?.startsWith("video/") ?? false;

export const youtubeURLRegex =
    /https?:\/\/(?:youtu\.be|(?:(?:www|m|music|gaming)\.)?youtube\.com)/;

export const isYoutubeURL = (url?: string) => hasMatch(youtubeURLRegex, url);

export const youtubeWatchURLRegex = /\/watch\?v=([a-zA-Z0-9-_]{11})/;

export const getYoutubeVideoId = (url?: string) =>
    url?.match(youtubeWatchURLRegex)?.[1];

export const isYoutubeWatchURL = (url?: string) =>
    !!url?.match(youtubeWatchURLRegex);

export const youtubePlaylistURLRegex = /\/playlist\?list=([A-Za-z0-9_]+)/;

export const getYoutubePlaylistId = (url?: string) =>
    url?.match(youtubePlaylistURLRegex)?.[1];

export const isYoutubePlaylistURL = (url?: string) =>
    !!url?.match(youtubePlaylistURLRegex);

const hasMatch = (regex: RegExp, value: string | undefined) =>
    !!value?.match(regex);
