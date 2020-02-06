import { Optional } from "../../types";
import { DlnaProfileType } from "./DlnaProfileType";
import { EncodingContext } from "./EncodingContext";
import { TranscodeSeekInfo } from "./TranscodeSeekInfo";

export interface TranscodingProfile {
    Container: Optional<string>;
    Type: DlnaProfileType;
    VideoCodec: Optional<string>;
    AudioCodec: Optional<string>;
    Protocol: Optional<string>;
    EstimateContentLength: Optional<string>;
    EnableMpegtsM2TsMode: Optional<string>;
    TranscodeSeekInfo: TranscodeSeekInfo;
    CopyTimestamps: boolean;
    Context: EncodingContext;
    EnableSubtitlesInManifest: boolean;
    MaxAudioChannels: number;
    SegmentLength: number;
    BreakOnNonKeyFrames: boolean;
}
