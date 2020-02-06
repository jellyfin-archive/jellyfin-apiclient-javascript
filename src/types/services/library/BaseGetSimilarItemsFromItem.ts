import { Optional } from "../../types";
import { BaseGetSimilarItems } from "./BaseGetSimilarItems";

export interface BaseGetSimilarItemsFromItem extends BaseGetSimilarItems {
    ExcludeArtistIds?: Optional<string>;
}
