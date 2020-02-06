import { Guid } from "../../Guid";
import { SortOrder } from "../../model/entities/SortOrder";
import { Optional } from "../../types";
import { HasDtoOptions } from "../HasDtoOptions";

export interface GetPrograms extends HasDtoOptions {
    ChannelIds?: Optional<string>;
    UserId?: Guid;
    MinStartDate?: Optional<string>;
    HasAired?: Optional<boolean>;
    IsAiring?: Optional<boolean>;
    MaxStartDate?: Optional<string>;
    MinEndDate?: Optional<string>;
    MaxEndDate?: Optional<string>;
    IsMovie?: Optional<boolean>;
    IsSeries?: Optional<boolean>;
    IsNews?: Optional<boolean>;
    IsKids?: Optional<boolean>;
    IsSports?: Optional<boolean>;
    StartIndex?: Optional<number>;
    Limit?: Optional<number>;
    SortBy?: Optional<string>;
    SortOrder?: Optional<SortOrder>;
    Genres?: Optional<string>;
    GenreIds?: Optional<string>;
    EnableTotalRecordCount?: boolean;
    SeriesTimerId?: Optional<string>;
    LibrarySeries?: Optional<string>;
}
