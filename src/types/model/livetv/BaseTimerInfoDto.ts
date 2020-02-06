import { Guid } from "../../Guid";
import { Optional } from "../../types";
import { KeepUntil } from "./KeepUntil";

export interface BaseTimerInfoDto {
    Id: Optional<string>;
    Type: Optional<string>;
    ServerId: Optional<string>;
    ExternalId: Optional<string>;
    ChannelId: Guid;
    ExternalChannelId: Optional<string>;
    ChannelName: Optional<string>;
    ChannelPrimaryImageTag: Optional<string>;
    ProgramId: Optional<string>;
    ExternalProgramId: Optional<string>;
    Name: Optional<string>;
    Overview: Optional<string>;
    StartDate: Date;
    EndDate: Date;
    ServiceName: Optional<string>;
    Priority: number;
    PrePaddingSeconds: number;
    PostPaddingSeconds: number;
    IsPrePaddingRequired: boolean;
    ParentBackdropItemId: Optional<string>;
    ParentBackdropImageTags: Optional<string[]>;
    IsPostPaddingRequired: boolean;
    KeepUntil: KeepUntil;
}
