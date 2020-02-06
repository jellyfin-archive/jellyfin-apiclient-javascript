import { Optional } from "../../types";
import { InstallationInfo } from "../updates/InstallationInfo";
import { PackageVersionClass } from "../updates/PackageVersionClass";
import { Architecture } from "./Architecture";
import { FFmpegLocation } from "./FFmpegLocation";
import { PublicSystemInfo } from "./PublicSystemInfo";

export interface SystemInfo extends PublicSystemInfo {
    SystemUpdateLevel: PackageVersionClass;
    OperatingSystemDisplayName: Optional<string>;
    PackageName: Optional<string>;
    HasPendingRestart: boolean;
    IsShuttingDown: boolean;
    SupportsLibraryMonitor: boolean;
    WebSocketPortNumber: number;
    CompletedInstallations: InstallationInfo[];
    CanSelfRestart: boolean;
    CanLaunchWebBrowser: boolean;
    ProgramDataPath: Optional<string>;
    WebPath: Optional<string>;
    ItemsByNamePath: Optional<string>;
    CachePath: Optional<string>;
    LogPath: Optional<string>;
    InternalMetadataPath: Optional<string>;
    TranscodingTempPath: Optional<string>;
    HttpServerPortNumber: number;
    SupportsHttps: boolean;
    HttpsPortNumber: number;
    HasUpdateAvailable: boolean;
    EncoderLocation: FFmpegLocation;
    SystemArchitecture: Architecture;
}
