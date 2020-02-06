import { Optional } from "../../types";
import { ImageType } from "../entities/ImageType";

export interface ImageProviderInfo {
    Name: Optional<string>;
    SupportedImages: ImageType[];
}
