import { RecordingStatus } from "../../model/livetv/RecordingStatus";
import { Optional } from "../../types";
import { HasDtoOptions } from "../HasDtoOptions";

export interface GetRecordingSeries extends HasDtoOptions {
    ChannelId?: Optional<string>;
    UserId?: Optional<string>;
    GroupId?: Optional<string>;
    StartIndex?: Optional<number>;
    Limit?: Optional<number>;
    Status?: Optional<RecordingStatus>;
    IsInProgress?: Optional<boolean>;
    SeriesTimerId?: Optional<string>;
    EnableTotalRecordCount?: boolean;
}
