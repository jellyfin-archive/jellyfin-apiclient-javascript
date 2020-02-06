import { DynamicDayOfWeek } from "./DynamicDayOfWeek";

export interface AccessSchedule {
    DayOfWeek: DynamicDayOfWeek;
    StartHour: number;
    EndHour: number;
}
