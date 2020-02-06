import { Optional } from "../../types";
import { ImageType } from "../entities/ImageType";
import { DayOfWeek } from "../tasks/DayOfWeek";
import { BaseTimerInfoDto } from "./BaseTimerInfoDto";
import { DayPattern } from "./DayPattern";

export interface SeriesTimerInfoDto extends BaseTimerInfoDto {
    RecordAnyTime: boolean;
    SkipEpisodesInLibrary: boolean;
    RecordAnyChannel: boolean;
    KeepUpTo: number;
    RecordNewOnly: boolean;
    Days: DayOfWeek[];
    DayPattern: Optional<DayPattern>;
    ImageTags: Record<ImageType, string>;
    ParentThumbItemId: Optional<string>;
    ParentThumbImageTag: Optional<string>;
    ParentPrimaryImageItemId: Optional<string>;
    ParentPrimaryImageTag: Optional<string>;
}
