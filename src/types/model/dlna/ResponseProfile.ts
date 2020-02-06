import { Optional } from "../../types";
import { DlnaProfileType } from "./DlnaProfileType";
import { ProfileCondition } from "./ProfileCondition";

export interface ResponseProfile {
    Container: Optional<string>;
    AudioCodec: Optional<string>;
    VideoCodec: Optional<string>;
    Type: DlnaProfileType;
    OrgPn: Optional<string>;
    MimeType: Optional<string>;
    Conditions: ProfileCondition[];
}
