import { Guid } from "../../Guid";
import { Optional } from "../../types";
import { UserActionType } from "./UserActionType";

export interface UserAction {
    Id: Optional<string>;
    ServerId: Optional<string>;
    UserId: Guid;
    ItemId: Guid;
    Type: UserActionType;
    Date: number;
    PositionTicks: Optional<number>;
}
