import { Guid } from "../../Guid";
import { BaseItemDto } from "../dto/BaseItemDto";
import { QueryResult } from "./QueryResult";

export interface ThemeMediaResult extends QueryResult<BaseItemDto> {
    OwnerId: Guid;
}
