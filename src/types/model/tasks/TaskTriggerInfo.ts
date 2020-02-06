import { Optional } from "../../types";
import { DayOfWeek } from "./DayOfWeek";
import { TriggerType } from "./TriggerType";

export interface TaskTriggerInfo {
    Type: Optional<TriggerType>;
    TimeOfDayTicks: Optional<number>;
    IntervalTicks: Optional<number>;
    DayOfWeek: Optional<DayOfWeek>;
    MaxRuntimeTicks: Optional<number>;
}
