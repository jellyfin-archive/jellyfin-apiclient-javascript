import { Optional } from "../../types";

export interface BaseApplicationConfiguration {
    LogFileRetentionDays: number;
    IsStartupWizardCompleted: boolean;
    CachePath: Optional<string>;
}
