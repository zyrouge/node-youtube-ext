export class CookieJar {
    cookieMap: Record<string, string> = {};
    disabled = false;

    cookieHeaderValue() {
        if (this.disabled) return;
        return CookieJar.stringifyCookieMap(this.cookieMap);
    }

    utilizeResponseHeaders(
        headers: Record<string, string | string[] | undefined>
    ) {
        const setCookie = headers["set-cookie"];
        if (!setCookie) return;
        try {
            CookieJar.parseSetCookie(setCookie, this.cookieMap);
        } catch (_) {}
    }

    static stringifyCookieMap(cookies: Record<string, string>) {
        return Object.entries(cookies)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join("; ");
    }

    static parseCookieString(
        cookie: string,
        options?: {
            ignoredKeys?: string[];
            cookieMap?: Record<string, string>;
        }
    ) {
        const cookieMap = options?.cookieMap ?? ({} as Record<string, string>);
        return cookie.split(";").reduce((pv, cv) => {
            const [k, v] = cv.trim().split("=");
            if (!k || !v || options?.ignoredKeys?.includes(k.toLowerCase())) {
                return pv;
            }
            pv[k] = decodeURIComponent(v);
            return pv;
        }, cookieMap);
    }

    static setCookieIgnoredKeys = [
        "expires",
        "max-age",
        "secure",
        "httponly",
        "samesite",
        "path",
        "domain",
        "gps",
        "priority",
    ];

    static parseSetCookie(
        cookies: string | string[],
        cookieMap: Record<string, string> = {}
    ) {
        if (Array.isArray(cookies)) {
            for (const x of cookies) {
                CookieJar.parseCookieString(x, {
                    ignoredKeys: CookieJar.setCookieIgnoredKeys,
                    cookieMap,
                });
            }
            return cookieMap;
        }
        return CookieJar.parseCookieString(cookies, {
            ignoredKeys: CookieJar.setCookieIgnoredKeys,
            cookieMap,
        });
    }
}

export const cookieJar = new CookieJar();
