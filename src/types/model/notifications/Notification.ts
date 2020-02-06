import { Optional } from "../../types";
import { NotificationLevel } from "./NotificationLevel";

export interface Notification {
    Id: Optional<string>;
    UserId: Optional<string>;
    Date: Date;
    IsRead: boolean;
    Name: Optional<string>;
    Description: Optional<string>;
    Url: Optional<string>;
    Level: NotificationLevel;
}
