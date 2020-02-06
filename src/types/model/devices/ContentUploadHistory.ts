import { Optional } from "../../types";
import { LocalFileInfo } from "./LocalFileInfo";

export interface ContentUploadHistory {
    DeviceId: Optional<string>;
    FilesUploaded: LocalFileInfo[];
}
