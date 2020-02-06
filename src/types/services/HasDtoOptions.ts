import { Optional } from "../types";
import { HasItemFields } from "./HasItemFields";

export interface HasDtoOptions extends HasItemFields {
    EnableImages?: Optional<boolean>;
    EnableUserData?: Optional<boolean>;
    ImageTypeLimit?: Optional<number>;
    EnableImageTypes?: Optional<string>;
}
