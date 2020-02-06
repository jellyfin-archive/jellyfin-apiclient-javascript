import { Optional } from "../../types";
import { UserDto } from "../dto/UserDto";
import { SessionInfo } from "../session/SessionInfo";

export interface AuthenticationResult {
    User: Optional<UserDto>;
    SessionInfo: Optional<SessionInfo>;
    AccessToken: Optional<string>;
    ServerId: Optional<string>;
}
