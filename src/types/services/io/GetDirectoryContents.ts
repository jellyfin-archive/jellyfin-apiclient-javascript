import { Optional } from "../../types";

export interface GetDirectoryContents {
    Path: Optional<string>;
    IncludeFiles?: boolean;
    IncludeDirectories?: boolean;
}
