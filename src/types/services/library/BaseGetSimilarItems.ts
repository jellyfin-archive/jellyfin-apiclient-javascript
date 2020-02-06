import { Guid } from "../../Guid";
import { Optional } from "../../types";
import { HasDtoOptions } from "../HasDtoOptions";

export interface BaseGetSimilarItems extends HasDtoOptions {
    UserId?: Guid;
    Limit: Optional<number>;
}
