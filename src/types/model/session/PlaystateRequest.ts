import { Optional } from "../../types";
import { PlaystateCommand } from "./PlaystateCommand";

export interface PlaystateRequest {
    Command?: PlaystateCommand;
    SeekPositionTicks?: Optional<number>;
    ControllingUserId?: Optional<string>;
}
