import { ConnectionMode } from "./ConnectionMode";
import { Optional } from "./types";
import { UserLinkType } from "./UserLinkType";

export interface ServerInfo {
    manualAddressOnly?: Optional<boolean>; // used in ConnectionManager.tryReconnect
    UserId?: Optional<string>;
    AccessToken?: Optional<string>;
    Id?: Optional<string>;
    Name?: Optional<string>;
    LocalAddress?: Optional<string>;
    ManualAddress?: Optional<string>;
    RemoteAddress?: Optional<string>;
    DateLastAccessed?: Optional<number>;
    UserLinkType?: Optional<UserLinkType>;
    ExchangeToken?: Optional<any>; // Only seen as null but guessing this is a string?
    LastConnectionMode?: Optional<ConnectionMode>;
    ConnectServerId?: Optional<string>; // Not sure if used / needed
}
