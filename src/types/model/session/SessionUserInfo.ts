import { Guid } from "../../Guid";
import { Optional } from "../../types";

export interface SessionUserInfo {
    UserId: Guid;
    UserName: Optional<string>;
}
