import { MetadataRefreshMode } from "../../model/providers/MetadataRefreshMode";

export interface BaseRefreshRequest {
    MetadataRefreshMode?: MetadataRefreshMode;
    ImageRefreshMode?: MetadataRefreshMode;
    ReplaceAllMetadata?: boolean;
    ReplaceAllImages?: boolean;
}
