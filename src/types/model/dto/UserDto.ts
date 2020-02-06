import { Guid } from "../../Guid";
import { Optional } from "../../types";
import { UserConfiguration } from "../configuration/UserConfiguration";
import { UserPolicy } from "../users/UserPolicy";

export interface UserDto {
    Name: Optional<string>;
    ServerId: Optional<string>;
    ServerName: Optional<string>;
    Id: Guid;
    PrimaryImageTag: Optional<string>;
    HasPassword: boolean;
    HasConfiguredPassword: boolean;
    HasConfiguredEasyPassword: boolean;
    EnableAutoLogin: Optional<boolean>;
    LastLoginDate: Optional<Date>;
    LastActivityDate: Optional<Date>;
    Configuration: Optional<UserConfiguration>;
    Policy: Optional<UserPolicy>;
    PrimaryImageAspectRatio: Optional<number>;
}
