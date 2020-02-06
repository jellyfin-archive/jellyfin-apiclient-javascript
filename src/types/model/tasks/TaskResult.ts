import { Optional } from "../../types";
import { TaskCompletionStatus } from "./TaskCompletionStatus";

export interface TaskResult {
    StartTimeUtc: Date;
    EndTimeUtc: Date;
    Status: TaskCompletionStatus;
    Name: Optional<string>;
    Key: Optional<string>;
    Id: Optional<string>;
    ErrorMessage: Optional<string>;
    LongErrorMessage: Optional<string>;
}
