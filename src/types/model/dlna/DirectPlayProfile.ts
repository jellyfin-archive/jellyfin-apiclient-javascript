import { Optional } from "../../types";
import { DlnaProfileType } from "./DlnaProfileType";

export interface DirectPlayProfile {
    Container: Optional<string>;
    AudioCodec: Optional<string>;
    VideoCodec: Optional<string>;
    Type: DlnaProfileType;
}
