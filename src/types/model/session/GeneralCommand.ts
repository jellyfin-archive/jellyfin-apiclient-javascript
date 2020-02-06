import { Guid } from "../../Guid";
import { Optional } from "../../types";
import { GeneralCommandType } from "./GeneralCommandType";

export interface GeneralCommand {
    Name?: Optional<GeneralCommandType | string>;
    ControllingUserId?: Guid;
    Arguments?: Record<string, string>;
}
