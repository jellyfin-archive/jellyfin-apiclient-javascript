import { Optional } from "../../types";

export interface UpdateUserPassword {
    CurrentPassword?: Optional<string>;
    CurrentPw?: Optional<string>;
    NewPw?: Optional<string>;
    ResetPassword?: boolean;
}
