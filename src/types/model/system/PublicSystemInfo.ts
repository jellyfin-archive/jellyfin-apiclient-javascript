import { Optional } from "../../types";

export interface PublicSystemInfo {
    LocalAddress: Optional<string>;
    ServerName: Optional<string>;
    Version: Optional<string>;
    ProductName: Optional<string>;
    OperatingSystem: Optional<string>;
    Id: Optional<string>;
}
