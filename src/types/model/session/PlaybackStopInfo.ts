import { Optional } from "../../types";
import { BasePlaybackInfo } from "../mediainfo/BasePlaybackInfo";

export interface PlaybackStopInfo extends BasePlaybackInfo {
    Failed: boolean;
    NextMediaType: Optional<string>;
}
