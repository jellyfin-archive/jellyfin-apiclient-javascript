import { Optional } from "../../types";
import { FileSystemEntryType } from "./FileSystemEntryType";

export interface FileSystemEntryInfo {
    Name: Optional<string>;
    Path: Optional<string>;
    Type: FileSystemEntryType;
}
