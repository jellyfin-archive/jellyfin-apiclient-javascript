import { Guid } from "../../Guid";
import { Optional } from "../../types";
import { HasDtoOptions } from "../HasDtoOptions";

export interface GetMovieRecommendations extends HasDtoOptions {
    CategoryLimit?: number;
    ItemLimit?: number;
    UserId?: Guid;
    ParentId?: Optional<string>;
}
