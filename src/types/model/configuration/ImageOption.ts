import { ImageType } from "../entities/ImageType";

export interface ImageOption {
    Type: ImageType;
    Limit: number;
    MinWidth: number;
}
