import http from "http";
import https from "https";

export type getOptions = http.RequestOptions | https.RequestOptions;
export type getData = http.IncomingMessage & { data: string };

export const get = (url: string, options: getOptions = {}) =>
    new Promise<getData>(async (resolve, reject) => {
        (url.startsWith("https") ? https : http)
            .get(url, options, (res) => {
                if (res.statusCode !== 200)
                    return reject(
                        `Request failed with status code ${res.statusCode}`
                    );

                let data = "";
                res.setEncoding("utf8");

                res.on("data", (chunk) => {
                    data += chunk;
                });

                res.on("end", () => {
                    resolve(Object.assign(res, { data }));
                });
            })
            .on("error", reject);
    });

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

const merge2Obj = <T>(one: T, two: T) => {
    for (const key in two) {
        if (Object.prototype.hasOwnProperty.call(two, key)) {
            const ele = two[key];
            if (typeof ele === "object") one[key] = merge2Obj(one[key], ele);
            else one[key] = ele;
        }
    }
    return one;
};

export const mergeObj = <T>(res: T, ...objs: T[]) => {
    objs.forEach((obj) => merge2Obj(res, obj));
    return res;
};
