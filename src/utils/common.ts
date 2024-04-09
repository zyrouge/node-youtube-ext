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
    const first = data.split(start, 2)[1];
    if (typeof first !== "string") {
        throw new Error(`Unable to match prefix (${first})`);
    }
    const second = first.split(end, 1)[0];
    if (typeof second !== "string") {
        throw new Error(`Unable to match suffix (${second})`);
    }
    return second;
};

export const contentBetweenEnds = (
    data: string,
    start: string,
    ends: [string, string][]
) => {
    const first = data.split(start, 2)[1]!;
    for (const [x, y] of ends) {
        const second = first.split(x, 1)[0]!;
        if (second.length !== first.length) {
            return second + y;
        }
    }
    throw new Error(
        `Unable to match any of the suffixes (${JSON.stringify(ends)})`
    );
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

export const requireOrThrow = <T>(moduleName: string): T => {
    try {
        const module: T = require(moduleName);
        return module;
    } catch (_) {
        throw new Error(`Couldn't access "${moduleName}". Did you install it?`);
    }
};

export const isModuleInstalled = (moduleName: string) => {
    try {
        require(moduleName);
        return true;
    } catch (_) {
        return false;
    }
};
