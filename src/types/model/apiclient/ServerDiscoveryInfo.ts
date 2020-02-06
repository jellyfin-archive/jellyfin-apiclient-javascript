import { Optional } from "../../types";

export interface ServerDiscoveryInfo {
    Address: Optional<string>;
    Id: Optional<string>;
    Name: Optional<string>;
    EndpointAddress: Optional<string>;
}
