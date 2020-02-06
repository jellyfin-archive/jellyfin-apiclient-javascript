import { Guid } from "../../Guid";
import { Optional } from "../../types";
import { ClientCapabilities } from "../session/ClientCapabilities";

export interface DeviceInfo {
    Name: Optional<string>;
    Id: Optional<string>;
    LastUserName: Optional<string>;
    AppName: Optional<string>;
    AppVersion: Optional<string>;
    LastUserId: Guid;
    DateLastActivity: Date;
    Capabilities: Optional<ClientCapabilities>;
    IconUrl: Optional<string>;
}
