import { Optional } from "../../types";
import { CodecType } from "./CodecType";
import { ProfileCondition } from "./ProfileCondition";

export interface CodecProfile {
    Type: CodecType;
    Conditions: ProfileCondition[];
    ApplyConditions: ProfileCondition[];
    Codec: Optional<string>;
    Container: Optional<string>;
}
