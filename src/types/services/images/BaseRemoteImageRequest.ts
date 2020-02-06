import { ImageType } from "../../model/entities/ImageType";
import { Optional } from "../../types";

export interface BaseRemoteImageRequest {
    Type?: Optional<ImageType>;
    StartIndex?: Optional<number>;
    Limit?: Optional<number>;
    ProviderName?: Optional<string>;
    IncludeAllLanguages?: boolean;
}
