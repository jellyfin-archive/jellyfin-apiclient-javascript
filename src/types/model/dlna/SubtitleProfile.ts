import { Optional } from "../../types";
import { SubtitleDeliveryMethod } from "./SubtitleDeliveryMethod";

export interface SubtitleProfile {
    Format: Optional<string>;
    Method: SubtitleDeliveryMethod;
    DidlMode: Optional<string>;
    Language: Optional<string>;
    Container: Optional<string>;
}
