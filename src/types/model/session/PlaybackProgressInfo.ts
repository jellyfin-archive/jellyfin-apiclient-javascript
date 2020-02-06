import { Optional } from "../../types";
import { BasePlaybackInfo } from "../mediainfo/BasePlaybackInfo";
import { PlayMethod } from "./PlayMethod";
import { RepeatMode } from "./RepeatMode";

export interface PlaybackProgressInfo extends BasePlaybackInfo {
    CanSeek: boolean;
    AudioStreamIndex: Optional<number>;
    SubtitleStreamIndex: Optional<number>;
    IsPaused: boolean;
    IsMuted: boolean;
    PlaybackStartTimeTicks: Optional<number>;
    VolumeLevel: Optional<number>;
    Brightness: Optional<number>;
    AspectRatio: Optional<string>;
    PlayMethod: PlayMethod;
    RepeatMode: RepeatMode;
    EventName?: string; // no mention of this in the backend, but used in the client
}
