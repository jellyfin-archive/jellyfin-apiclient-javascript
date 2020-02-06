import { Optional } from "../../types";
import { HttpHeaderInfo } from "./HttpHeaderInfo";

export interface DeviceIdentification {
    FriendlyName: Optional<string>;
    ModelNumber: Optional<string>;
    SerialNumber: Optional<string>;
    ModelName: Optional<string>;
    ModelDescription: Optional<string>;
    DeviceDescription: Optional<string>;
    ModelUrl: Optional<string>;
    Manufacturer: Optional<string>;
    ManufacturerUrl: Optional<string>;
    Headers: HttpHeaderInfo[];
}
