import { Optional } from "../../types";
import { BaseItemDto } from "../dto/BaseItemDto";
import { BaseTimerInfoDto } from "./BaseTimerInfoDto";
import { RecordingStatus } from "./RecordingStatus";

export interface TimerInfoDto extends BaseTimerInfoDto {
    Status: RecordingStatus;
    SeriesTimerId: Optional<string>;
    ExternalSeriesTimerId: Optional<string>;
    RunTimeTicks: Optional<number>;
    ProgramInfo: Optional<BaseItemDto>;
}
