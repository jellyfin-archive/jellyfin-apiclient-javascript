import { Guid } from "../../Guid";
import { Optional } from "../../types";
import { BaseItemDto } from "../dto/BaseItemDto";
import { ClientCapabilities } from "./ClientCapabilities";
import { PlayerStateInfo } from "./PlayerStateInfo";
import { QueueItem } from "./QueueItem";
import { SessionUserInfo } from "./SessionUserInfo";
import { TranscodingInfo } from "./TranscodingInfo";

export interface SessionInfo {
    PlayState: PlayerStateInfo;
    AdditionalUsers: SessionUserInfo[];
    Capabilities: Optional<ClientCapabilities>;
    RemoteEndPoint: Optional<string>;
    PlayableMediaTypes: string[];
    Id: Optional<string>;
    UserId: Guid;
    UserName: Optional<string>;
    Client: Optional<string>;
    LastActivityDate: Date;
    LastPlaybackCheckIn: Date;
    DeviceName: Optional<string>;
    DeviceType: Optional<string>;
    NowPlayingItem: Optional<BaseItemDto>;
    DeviceId: Optional<string>;
    ApplicationVersion: Optional<string>;
    AppIconUrl: Optional<string>;
    SupportedCommands: string[];
    TranscodingInfo: Optional<TranscodingInfo>;
    IsActive: boolean;
    SupportsMediaControl: boolean;
    SupportsRemoteControl: boolean;
    NowPlayingQueue: Optional<QueueItem[]>;
    HasCustomDeviceName: boolean;
    PlaylistItemId: Optional<string>;
    ServerId: Optional<string>;
    UserPrimaryImageTag: Optional<string>;
}
