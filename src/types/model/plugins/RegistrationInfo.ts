import { Optional } from "../../types";

export interface RegistrationInfo {
    Name: Optional<string>;
    ExpirationDate: Date;
    IsTrial: boolean;
    IsRegistered: boolean;
}
