import { Optional } from "../../types";
import { BaseItemDto } from "./BaseItemDto";
import { RecommendationType } from "./RecommendationType";

export interface RecommendationDto {
    Items: BaseItemDto[];
    RecommendationType: RecommendationType;
    BaselineItemName: Optional<string>;
    CategoryId: Optional<string>;
}
