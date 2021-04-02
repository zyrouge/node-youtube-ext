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
    },
    err: {
        type: (key: string, expected: string, received: string) =>
            `Expected "${key}" to be "${expected}" but received "${received}".`,
    },
};
