import { Optional } from "../../types";

export interface CultureDto {
    Name: Optional<string>;
    DisplayName: Optional<string>;
    TwoLetterISOLanguageName: Optional<string>;
    ThreeLetterISOLanguageName: Optional<string>;
    ThreeLetterISOLanguageNames: string[];
}
