import { Optional } from "../../types";

export interface PluginInfo {
    Name: Optional<string>;
    Version: Optional<string>;
    ConfigurationFileName: Optional<string>;
    Description: Optional<string>;
    Id: Optional<string>;
    ImageUrl: Optional<string>;
}
