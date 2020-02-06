import { ImageType } from "../../model/entities/ImageType";
import { Optional } from "../../types";

export interface BaseDownloadRemoteImage {
    Type: ImageType;
    ProviderName?: Optional<string>;
    ImageUrl?: Optional<string>;
}
