import { Guid } from "../../Guid";
import { Optional } from "../../types";

export interface GetSearchHints {
    StartIndex?: Optional<number>;
    Limit?: Optional<number>;
    UserId?: Guid;
    SearchTerm?: Optional<string>;
    IncludePeople?: boolean;
    IncludeMedia?: boolean;
    IncludeGenres?: boolean;
    IncludeStudios?: boolean;
    IncludeArtists?: boolean;
    IncludeItemTypes?: boolean;
    ExcludeItemTypes?: boolean;
    MediaTypes?: Optional<string>;
    ParentId?: Optional<string>;
    IsMovie?: Optional<boolean>;
    IsSeries?: Optional<boolean>;
    IsNews?: Optional<boolean>;
    IsKids?: Optional<boolean>;
    IsSports?: Optional<boolean>;
}
