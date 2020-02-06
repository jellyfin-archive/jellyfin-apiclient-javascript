import { Guid } from "../../Guid";
import { SortOrder } from "../../model/entities/SortOrder";
import { Optional } from "../../types";
import { HasDtoOptions } from "../HasDtoOptions";
import { HasItemFields } from "../HasItemFields";

export interface GetEpisodes extends HasDtoOptions, HasItemFields {
    UserId: Guid;
    Season?: Optional<string>;
    SeasonId?: Optional<string>;
    IsMissing?: Optional<boolean>;
    AdjacentTo?: Optional<string>;
    StartItemId?: Optional<string>;
    StartIndex?: Optional<number>;
    Limit?: Optional<number>;
    SortBy?: Optional<string>;
    SortOrder?: Optional<SortOrder>;
}
