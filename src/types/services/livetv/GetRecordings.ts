import { Guid } from "../../Guid";
import { RecordingStatus } from "../../model/livetv/RecordingStatus";
import { Optional } from "../../types";
import { HasDtoOptions } from "../HasDtoOptions";

export interface GetRecordings extends HasDtoOptions {
    ChannelId?: Optional<string>;
    UserId?: Guid;
    StartIndex?: Optional<number>;
    Limit?: Optional<number>;
    Status?: Optional<RecordingStatus>;
    IsInProgress?: Optional<boolean>;
    SeriesTimerId?: Optional<string>;
    EnableTotalRecordCount?: boolean;
    IsMovie?: Optional<boolean>;
    IsSeries?: Optional<boolean>;
    IsKids?: Optional<boolean>;
    IsSports?: Optional<boolean>;
    IsNews?: Optional<boolean>;
    IsLibraryItem?: Optional<boolean>;
}
