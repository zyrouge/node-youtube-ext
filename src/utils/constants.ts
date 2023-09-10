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
            continuation: (key: string) =>
                `${constants.urls.base}/youtubei/v1/browse?key=${key}`,
        },
        channel: {
            base: (id: string) => `${constants.urls.base}/channel/${id}`,
        },
    },
    headers: {
        userAgent:
            "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:54.0) Gecko/20100101 Firefox/54.0",
    },
    errors: {
        type: (key: string, expected: string, received: string) =>
            `Expected "${key}" to be "${expected}" but received "${received}".`,
    },
};
