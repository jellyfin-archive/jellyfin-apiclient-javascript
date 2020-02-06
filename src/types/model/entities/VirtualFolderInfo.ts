import { Optional } from "../../types";
import { LibraryOptions } from "../configuration/LibraryOptions";
import { CollectionType } from "./CollectionType";

export interface VirtualFolderInfo {
    Name: Optional<string>;
    Locations: string[];
    CollectionType: Optional<CollectionType>;
    LibraryOptions: Optional<LibraryOptions>;
    ItemId: Optional<string>;
    PrimaryImageItemId: Optional<string>;
    RefreshProgress: Optional<number>;
    RefreshStatus: Optional<string>;
}
