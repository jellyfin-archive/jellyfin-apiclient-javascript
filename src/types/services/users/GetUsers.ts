import { Optional } from "../../types";

export interface GetUsers {
    IsHidden?: Optional<boolean>;
    IsDisabled?: Optional<boolean>;
    IsGuest?: Optional<boolean>;
}
