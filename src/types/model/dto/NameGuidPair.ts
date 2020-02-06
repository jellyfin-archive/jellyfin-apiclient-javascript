import { Guid } from "../../Guid";
import { Optional } from "../../types";

export interface NameGuidPair {
    Name: Optional<string>;
    Id: Guid;
}
