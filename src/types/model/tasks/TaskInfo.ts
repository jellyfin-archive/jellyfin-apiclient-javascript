import { Optional } from "../../types";
import { TaskResult } from "./TaskResult";
import { TaskState } from "./TaskState";
import { TaskTriggerInfo } from "./TaskTriggerInfo";

export interface TaskInfo {
    Name: Optional<string>;
    State: TaskState;
    CurrentProgressPercentage: Optional<number>;
    Id: Optional<string>;
    LastExecutionResult: Optional<TaskResult>;
    Triggers: TaskTriggerInfo[];
    Description: Optional<string>;
    Category: Optional<string>;
    IsHidden: boolean;
    Key: Optional<string>;
}
