import { Optional } from "../../types";

export interface MetadataOptions {
    ItemType: Optional<string>;
    DisabledMetadataSavers: string[];
    LocalMetadataReaderOrder: string[];
    DisabledMetadataFetchers: string[];
    MetadataFetcherOrder: string[];
    DisabledImageFetchers: string[];
    ImageFetcherOrder: string[];
}
