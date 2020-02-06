import { BaseItemDto } from "./model/dto/BaseItemDto";
import { Optional } from "./types";

export interface JobItem {
    AdditionalFiles: any[];
    OriginalFileName: Optional<string>;
    SyncJobItemId: Optional<string>;
    Item: Optional<BaseItemDto>;
}
