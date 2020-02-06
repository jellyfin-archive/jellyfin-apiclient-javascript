import { Guid } from "../../Guid";
import { Optional } from "../../types";
import { HasDtoOptions } from "../HasDtoOptions";

export interface GetRecommendedPrograms extends HasDtoOptions {
    UserId?: Guid;
    HasAired?: Optional<boolean>;
    IsAiring?: Optional<boolean>;
    IsMovie?: Optional<boolean>;
    IsSeries?: Optional<boolean>;
    IsNews?: Optional<boolean>;
    IsKids?: Optional<boolean>;
    IsSports?: Optional<boolean>;
    Limit?: Optional<number>;
    GenreIds?: Optional<string>;
    EnableTotalRecordCount?: boolean;
}
