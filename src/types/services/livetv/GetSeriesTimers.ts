import { SortOrder } from "../../model/entities/SortOrder";
import { TimerSortBy } from "../../model/livetv/TimerSortBy";
import { Optional } from "../../types";

export interface GetSeriesTimers {
    SortBy?: Optional<TimerSortBy>;
    SortOrder?: SortOrder;
}
