import { Guid } from "../../Guid";
import { Optional } from "../../types";

export interface GetQueryFilters {
    UserId?: Guid;
    ParentId?: Optional<string>;
    IncludeItemTypes?: Optional<string>;
    MediaTypes?: Optional<string>;
    IsAiring?: Optional<boolean>;
    IsMovie?: Optional<boolean>;
    IsSports?: Optional<boolean>;
    IsKids?: Optional<boolean>;
    IsNews?: Optional<boolean>;
    IsSeries?: Optional<boolean>;
    Recursive?: Optional<boolean>;
}
