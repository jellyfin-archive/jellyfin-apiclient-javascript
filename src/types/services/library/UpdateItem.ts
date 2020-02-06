import { BaseItemDto } from "../../model/dto/BaseItemDto";
import { Optional } from "../../types";

export interface UpdateItem extends BaseItemDto {
    ItemId: Optional<string>;
}
