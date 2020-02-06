import { Optional } from "../../types";

export interface UserItemDataDto {
    Rating: Optional<number>;
    PlayedPercentage: Optional<number>;
    UnplayedItemCount: Optional<number>;
    PlaybackPositionTicks: number;
    PlayCount: number;
    IsFavorite: boolean;
    Likes: Optional<boolean>;
    LastPlayedDate: Optional<Date>;
    Played: boolean;
    Key: Optional<string>;
    ItemId: Optional<string>;
}
