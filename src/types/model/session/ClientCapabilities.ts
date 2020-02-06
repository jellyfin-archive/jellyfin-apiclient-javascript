import { Optional } from "../../types";
import { DeviceProfile } from "../dlna/DeviceProfile";

export interface ClientCapabilities {
    PlayableMediaTypes: string[];
    SupportedCommands: string[];
    SupportsMediaControl: boolean;
    SupportsContentUploading: boolean;
    MessageCallbackUrl: Optional<string>;
    SupportsPersistentIdentifier: boolean;
    SupportsSync: boolean;
    DeviceProfile: Optional<DeviceProfile>;
    AppStoreUrl: Optional<string>;
    IconUrl: Optional<string>;
}
