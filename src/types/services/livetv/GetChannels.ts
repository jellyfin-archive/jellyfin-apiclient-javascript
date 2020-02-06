import { Guid } from "../../Guid";
import { SortOrder } from "../../model/entities/SortOrder";
import { ChannelType } from "../../model/livetv/ChannelType";
import { Optional } from "../../types";
import { HasDtoOptions } from "../HasDtoOptions";

export interface GetChannels extends HasDtoOptions {
    Type?: Optional<ChannelType>;
    UserId?: Guid;
    StartIndex?: Optional<number>;
    IsMovie?: Optional<boolean>;
    IsSeries?: Optional<boolean>;
    IsNews?: Optional<boolean>;
    IsKids?: Optional<boolean>;
    IsSports?: Optional<boolean>;
    Limit?: Optional<number>;
    IsFavorite?: Optional<boolean>;
    IsLiked?: Optional<boolean>;
    IsDisliked?: Optional<boolean>;
    EnableFavoriteSorting?: boolean;
    AddCurrentProgram?: boolean;
    SortBy?: Optional<string>;
    SortOrder?: Optional<SortOrder>;
}
