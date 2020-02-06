import { Optional } from "../../types";
import { DlnaProfileType } from "./DlnaProfileType";
import { ProfileCondition } from "./ProfileCondition";

export interface ContainerProfile {
    Type: DlnaProfileType;
    Conditions: ProfileCondition[];
    Container: Optional<string>;
}
