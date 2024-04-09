import { Dispatcher, request } from "undici";

export type UndiciRequestOptions = NonNullable<Parameters<typeof request>[1]>;

export const assertUndiciOkResponse = (response: Dispatcher.ResponseData) => {
    if (response.statusCode !== 200) {
        throw new Error(`Unexpected status code ${response.statusCode}`);
    }
};
