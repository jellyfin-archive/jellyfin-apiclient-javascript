import { Optional } from "../../types";
import { ProfileConditionType } from "./ProfileConditionType";
import { ProfileConditionValue } from "./ProfileConditionValue";

export interface ProfileCondition {
    Condition: ProfileConditionType;
    Property: ProfileConditionValue;
    Value: Optional<string>;
    IsRequired: boolean;
}
