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

export type IfNotNull<T, R, D = void> = T extends null
    ? D
    : T extends undefined
    ? D
    : R;

export interface MediaSource {
    IsLocal: boolean;
    SupportsTranscoding: boolean;
    SupportsDirectStream: boolean;
    SupportsDirectPlay: boolean;
}

export interface Item {
    SortName: string;
    DateCreated: Date;
    IsFolder: boolean;
    MediaType?: string;
    MediaSources: MediaSource[];
    Type?: string;
    Name: string;
    Id: string;
    SeriesId: Optional<string>;
    SeasonId: Optional<string>;
    AlbumId: Optional<string>;
    ParentId: Optional<string>;
    ParentThumbItemId: Optional<string>;
    ParentPrimaryImageItemId: Optional<string>;
    PrimaryImageItemId: Optional<string>;
    ParentLogoItemId: Optional<string>;
    ParentBackdropItemId: Optional<string>;
    ParentBackdropImageTags: Optional<string[]>;
}

export interface SyncedItem {
    SyncStatus: "synced";
    LocalPath: string;
    Item: Item;
}

export interface TBA1 {
    ServerId: string;
}
