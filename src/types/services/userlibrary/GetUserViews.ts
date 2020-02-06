import { Optional } from "../../types";

export interface GetUserViews {
    IncludeExternalContent: Optional<boolean>;
    IncludeHidden?: boolean;
    PresetViews?: Optional<string>;
}
