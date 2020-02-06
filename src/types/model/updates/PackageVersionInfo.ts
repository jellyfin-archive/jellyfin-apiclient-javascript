import { Optional } from "../../types";
import { PackageVersionClass } from "./PackageVersionClass";

export interface PackageVersionInfo {
    name: Optional<string>;
    guid: Optional<string>;
    versionStr: Optional<string>;
    classification: PackageVersionClass;
    description: Optional<string>;
    requiredVersionStr: Optional<string>;
    sourceUrl: Optional<string>;
    checksum: Optional<string>;
    targetFilename: Optional<string>;
    infoUrl: Optional<string>;
    runtimes: Optional<string>;
}
