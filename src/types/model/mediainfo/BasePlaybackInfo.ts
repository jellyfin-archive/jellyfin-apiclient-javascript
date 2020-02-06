import { Guid } from "../../Guid";
import { Optional } from "../../types";
import { BaseItemDto } from "../dto/BaseItemDto";
import { QueueItem } from "../session/QueueItem";

export interface BasePlaybackInfo {
    Item: Optional<BaseItemDto>;
    ItemId: Guid;
    SessionId: Optional<string>;
    MediaSourceId: Optional<string>;
    PositionTicks: Optional<number>;
    NowPlayingQueue: Optional<QueueItem[]>;
    PlaylistItemId: Optional<string>;
    PlaySessionId: Optional<string>;
    LiveStreamId: Optional<string>;
}
