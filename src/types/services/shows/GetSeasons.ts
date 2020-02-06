import { Guid } from "../../Guid";
import { Optional } from "../../types";
import { HasDtoOptions } from "../HasDtoOptions";
import { HasItemFields } from "../HasItemFields";

export interface GetSeasons extends HasItemFields, HasDtoOptions {
    UserId: Guid;
    IsSpecialSeason?: Optional<boolean>;
    IsMissing?: Optional<boolean>;
    AdjacentTo?: Optional<string>;
}
