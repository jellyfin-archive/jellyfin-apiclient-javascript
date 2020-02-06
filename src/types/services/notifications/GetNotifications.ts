import { Optional } from "../../types";

export interface GetNotifications {
    IsRead?: Optional<boolean>;
    StartIndex?: Optional<number>;
    Limit?: Optional<number>;
}
