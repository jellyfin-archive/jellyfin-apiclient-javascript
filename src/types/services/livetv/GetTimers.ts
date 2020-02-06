import { Optional } from "../../types";

export interface GetTimers {
    ChannelId?: Optional<string>;
    SeriesTimerId?: Optional<string>;
    IsActive?: Optional<boolean>;
    IsScheduled?: Optional<boolean>;
}
