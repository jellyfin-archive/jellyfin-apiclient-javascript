import { Optional } from "../../types";

export interface CountryInfo {
    Name: Optional<string>;
    DisplayName: Optional<string>;
    TwoLetterISORegionName: Optional<string>;
    ThreeLetterISORegionName: Optional<string>;
}
