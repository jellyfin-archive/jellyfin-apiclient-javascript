import { Optional } from "../../types";
import { DeleteImageRequest } from "./DeleteImageRequest";

export interface ImageRequest extends DeleteImageRequest {
    MaxWidth?: Optional<number>;
    MaxHeight?: Optional<number>;
    Width?: Optional<number>;
    Height?: Optional<number>;
    Quality?: Optional<number>;
    Tag?: Optional<string>;
    CropWhitespace?: Optional<boolean>;
    EnableImageEnhancers?: boolean;
    Format?: Optional<string>;
    AddPlayedIndicator?: boolean;
    PercentPlayed?: Optional<number>;
    UnplayedCount?: Optional<number>;
    Blur?: Optional<number>;
    BackgroundColor?: Optional<string>;
    ForegroundColor?: Optional<string>;

    MinScale?: number; // Doesn't exist in backend, but used in the client.
}
