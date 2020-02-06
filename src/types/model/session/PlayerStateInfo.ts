import { Optional } from "../../types";
import { PlayMethod } from "./PlayMethod";
import { RepeatMode } from "./RepeatMode";

export interface PlayerStateInfo {
    PositionTicks: Optional<number>;
    CanSeek: boolean;
    IsPaused: boolean;
    IsMuted: boolean;
    VolumeLevel: Optional<number>;
    AudioStreamIndex: Optional<number>;
    SubtitleStreamIndex: Optional<number>;
    MediaSourceId: Optional<string>;
    PlayMethod: Optional<PlayMethod>;
    RepeatMode: RepeatMode;
}
