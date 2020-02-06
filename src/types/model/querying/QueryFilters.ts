import { NameGuidPair } from "../dto/NameGuidPair";

export interface QueryFilters {
    Genres: NameGuidPair[];
    Tags: string[];
}
