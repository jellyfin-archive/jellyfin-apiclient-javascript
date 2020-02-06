import { Guid } from "../../Guid";
import { Optional } from "../../types";
import { HasDtoOptions } from "../HasDtoOptions";

export interface GetNextUpEpisodes extends HasDtoOptions {
    UserId: Guid;
    StartIndex?: Optional<number>;
    Limit?: Optional<number>;
    SeriesId?: Optional<string>;
    ParentId?: Optional<string>;
    EnableTotalRecordCount?: boolean;
}
