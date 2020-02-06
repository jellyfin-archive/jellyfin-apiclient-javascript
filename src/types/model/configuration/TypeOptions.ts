import { Optional } from "../../types";
import { ImageOption } from "./ImageOption";

export interface TypeOptions {
    Type: Optional<string>;
    MetadataFetchers: string[];
    MetadataFetcherOrder: string[];
    ImageFetchers: string[];
    ImageFetcherOrder: string[];
    ImageOptions: ImageOption[];
}
