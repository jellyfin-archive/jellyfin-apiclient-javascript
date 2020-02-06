import { Optional } from "../../types";

export interface ChapterInfo {
    StartPositionTicks: number;
    Name: Optional<string>;
    ImagePath: Optional<string>;
    ImageDateModified: Date;
    ImageTag: Optional<string>;
}
