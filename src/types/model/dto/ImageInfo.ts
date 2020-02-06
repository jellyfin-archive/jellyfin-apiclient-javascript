import { Optional } from "../../types";
import { ImageType } from "../entities/ImageType";

export interface ImageInfo {
    ImageType: ImageType;
    ImageIndex: Optional<number>;
    ImageTag: Optional<string>;
    Path: Optional<string>;
    Height: Optional<number>;
    Width: Optional<number>;
    Size: number;
}
