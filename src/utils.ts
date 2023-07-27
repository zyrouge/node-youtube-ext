export const constants = {
    urls: {
        base: "https://www.youtube.com",
        search: {
            base: (terms: string) =>
                `${
                    constants.urls.base
                }/results?search_query=${encodeURIComponent(terms)}`,
            filters: {
                video: "&sp=EgIQAQ%253D%253D",
                channel: "&sp=EgIQAg%253D%253D",
                playlist: "&sp=EgIQAw%253D%253D",
                film: "&sp=EgIQBA%253D%253D",
                programme: "&sp=EgIQBQ%253D%253D",
            },
        },
        video: {
            base: (id: string) =>
                `${constants.urls.base}/watch?v=${encodeURIComponent(id)}`,
        },
        playlist: {
            base: (id: string) =>
                `${constants.urls.base}/playlist?list=${encodeURIComponent(
                    id
                )}`,
            baseUrlRegex: /^(http|https:\/\/).*\/playlist?.*list=\w+/,
            getIdRegex: /^(http|https:\/\/).*list=(\w+)/,
        },
        channel: {
            base: (id: string) => `${constants.urls.base}/channel/${id}`,
        },
    },
    headers: {
        userAgent:
            "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:54.0) Gecko/20100101 Firefox/54.0",
    },
    err: {
        type: (key: string, expected: string, received: string) =>
            `Expected "${key}" to be "${expected}" but received "${received}".`,
    },
};

export const mergeObj = <T>(one: T, two: T) => {
    for (const key in two) {
        if (Object.prototype.hasOwnProperty.call(two, key)) {
            const ele = two[key];
            if (typeof ele === "object") one[key] = mergeObj(one[key], ele);
            else one[key] = ele;
        }
    }
    return one;
};

export const contentBetween = (data: string, start: string, end: string) => {
    return data.split(start)[1]!.split(end)[0]!;
};

export const parseQueryString = (data: string) => {
    const params: Record<string, string> = {};
    data.split("&").forEach((x) => {
        const [k, v] = x.split("=") as [string, string];
        params[k] = decodeURIComponent(v);
    });
    return params;
};

export const parseNumberOr = (data: string | undefined | null, def: number) => {
    if (typeof data === "string") {
        return parseInt(data);
    }
    return def;
};
