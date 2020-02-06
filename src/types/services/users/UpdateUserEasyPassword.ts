import { Optional } from "../../types";

export interface UpdateUserEasyPassword {
    NewPassword?: Optional<string>;
    NewPw?: Optional<string>;
    ResetPassword?: boolean;
}
