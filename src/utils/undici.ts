import { request } from "undici";

export type UndiciRequestOptions = NonNullable<Parameters<typeof request>[1]>;
