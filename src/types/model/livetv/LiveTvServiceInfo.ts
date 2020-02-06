import { Optional } from "../../types";
import { LiveTvServiceStatus } from "./LiveTvServiceStatus";

export interface LiveTvServiceInfo {
    Name: Optional<string>;
    HomePageUrl: Optional<string>;
    Status: LiveTvServiceStatus;
    StatusMessage: Optional<string>;
    Version: Optional<string>;
    HasUpdateAvailable: boolean;
    IsVisible: boolean;
    Tuners: string[];
}
