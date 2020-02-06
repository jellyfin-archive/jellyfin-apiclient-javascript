import { Optional } from "../../types";
import { PlaybackErrorCode } from "../dlna/PlaybackErrorCode";
import { MediaSourceInfo } from "../dto/MediaSourceInfo";

export interface PlaybackInfoResponse {
    MediaSources: MediaSourceInfo[];
    PlaySessionId: Optional<string>;
    ErrorCode: Optional<PlaybackErrorCode>;
}
