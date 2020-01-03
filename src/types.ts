export interface ServerInfo {
    UserId?: string;
    AccessToken?: string;
    Id: string;
    Name: string;
    LocalAddress?: string;
    ManualAddress?: string;
    RemoteAddress?: string;
}

export type UrlOptions = Record<
    string,
    string | number | boolean | null | undefined
    >;

export type Nullish = null | undefined;

export type Optional<T> = T | null | undefined;

export enum CompRelation {
    IS_SMALLER_THAN = -1,
    EQUALS = 0,
    IS_LARGER_THAN = 1
}
