import { Optional } from "../../types";
import { RatingType } from "../dto/RatingType";
import { ImageType } from "../entities/ImageType";

export interface RemoteImageInfo {
    ProviderName: Optional<string>;
    Url: Optional<string>;
    ThumbnailUrl: Optional<string>;
    Height: Optional<number>;
    Width: Optional<number>;
    CommunityRating: Optional<number>;
    VoteCount: Optional<number>;
    Language: Optional<string>;
    Type: ImageType;
    RatingType: RatingType;
}
