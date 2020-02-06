import { Guid } from "../../Guid";
import { Optional } from "../../types";

export interface GetSessions {
    ControllableByUserId?: Guid;
    DeviceId?: Optional<string>;
    ActiveWithinSeconds?: Optional<number>;
}
