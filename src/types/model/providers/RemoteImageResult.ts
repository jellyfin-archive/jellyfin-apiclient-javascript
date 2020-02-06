import { RemoteImageInfo } from "./RemoteImageInfo";

export interface RemoteImageResult {
    Images: RemoteImageInfo[];
    TotalRecordCount: number;
    Providers: string[];
}
