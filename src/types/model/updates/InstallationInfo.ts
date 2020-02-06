import { Guid } from "../../Guid";
import { Optional } from "../../types";
import { PackageVersionClass } from "./PackageVersionClass";

export interface InstallationInfo {
    Id: Guid;
    Name: Optional<string>;
    AssemblyGuid: Optional<string>;
    Version: Optional<string>;
    UpdateClass: PackageVersionClass;
}
