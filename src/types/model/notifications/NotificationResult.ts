import { Optional } from "../../types";
import { Notification } from "./Notification";

export interface NotificationResult {
    Notifications: Optional<Notification[]>;
    TotalRecordCount: number;
}
