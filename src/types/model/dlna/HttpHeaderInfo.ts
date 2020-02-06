import { Optional } from "../../types";
import { HeaderMatchType } from "./HeaderMatchType";

export interface HttpHeaderInfo {
    Name: Optional<string>;
    Value: Optional<string>;
    Match: HeaderMatchType;
}
