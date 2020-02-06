import { BaseItemDto } from "./model/dto/BaseItemDto";
import { SyncStatus } from "./SyncStatus";
import { Optional } from "./types";

export interface LocalItem {
    LocalPathParts?: Optional<string[]>;
    LocalPath?: Optional<string>;
    SyncStatus?: SyncStatus;
    SyncJobItemId?: Optional<string>;
    Item: BaseItemDto;
    ItemId: string;
    ServerId: string;
    Id: string;
}
