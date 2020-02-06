import { Optional } from "../../types";
import { TranscodeReason } from "./TranscodeReason";

export interface TranscodingInfo {
    AudioCodec: Optional<string>;
    VideoCodec: Optional<string>;
    Container: Optional<string>;
    IsVideoDirect: boolean;
    IsAudioDirect: boolean;
    Bitrate: Optional<number>;
    Framerate: Optional<number>;
    CompletionPercentage: Optional<number>;
    Width: Optional<number>;
    Height: Optional<number>;
    AudioChannels: Optional<number>;
    TranscodeReasons: TranscodeReason[];
}
