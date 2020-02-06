import { Guid } from "../../Guid";
import { Optional } from "../../types";
import { HasDtoOptions } from "../HasDtoOptions";

export interface GetLatestMedia extends HasDtoOptions {
    Limit?: number;
    ParentId?: Guid;
    IncludeItemTypes?: Optional<string>;
    IsFolder?: Optional<boolean>;
    IsPlayed?: Optional<boolean>;
    GroupItems?: boolean;
}
