import { LiveTvServiceInfo } from "./LiveTvServiceInfo";

export interface LiveTvInfo {
    Services: LiveTvServiceInfo[];
    IsEnabled: boolean;
    EnabledUsers: string[];
}
