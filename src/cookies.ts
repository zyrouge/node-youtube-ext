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
        cookieMap: Record<string, string> = {}
    ) {
        return cookie.split(";").reduce((pv, cv) => {
            const [k, v] = cv.trim().split("=");
            if (!k || !v || CookieJar.shouldIgnoreCookie(k, v)) {
                return pv;
            }
            pv[k] = decodeURIComponent(v);
            return pv;
        }, cookieMap);
    }

    static parseSetCookie(
        cookies: string | string[],
        cookieMap: Record<string, string> = {}
    ) {
        if (Array.isArray(cookies)) {
            for (const x of cookies) {
                CookieJar.parseCookieString(x, cookieMap);
            }
            return cookieMap;
        }
        return CookieJar.parseCookieString(cookies, cookieMap);
    }

    static ignoredCookieKeys = [
        "expires",
        "max-age",
        "secure",
        "httponly",
        "samesite",
        "path",
        "domain",
        "gps",
        "priority",
        "login_info",
    ];

    static shouldIgnoreCookie(key: string, value: string) {
        return (
            value === "EXPIRED" ||
            CookieJar.ignoredCookieKeys.includes(key.toLowerCase())
        );
    }
}

export const cookieJar = new CookieJar();
