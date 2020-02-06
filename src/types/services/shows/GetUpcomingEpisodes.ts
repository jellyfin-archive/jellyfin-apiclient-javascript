import { Guid } from "../../Guid";
import { Optional } from "../../types";
import { HasDtoOptions } from "../HasDtoOptions";

export interface GetUpcomingEpisodes extends HasDtoOptions {
    UserId: Guid;
    StartIndex?: Optional<number>;
    Limit?: Optional<number>;
    ParentId?: Optional<string>;
}
