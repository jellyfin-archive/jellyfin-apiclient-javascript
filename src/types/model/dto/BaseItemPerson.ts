import { Optional } from "../../types";

export interface BaseItemPerson {
    Name: Optional<string>;
    Id: Optional<string>;
    Role: Optional<string>;
    Type: Optional<string>;
    PrimaryImageTag: Optional<string>;
}
