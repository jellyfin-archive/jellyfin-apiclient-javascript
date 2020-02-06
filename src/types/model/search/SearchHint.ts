import { Guid } from "../../Guid";
import { Optional } from "../../types";

export interface SearchHint {
    ItemId: Guid;
    Id: Guid;
    Name: Optional<string>;
    MatchedTerm: Optional<string>;
    IndexNumber: Optional<number>;
    ProductionYear: Optional<number>;
    ParentIndexNumber: Optional<number>;
    PrimaryImageTag: Optional<string>;
    ThumbImageTag: Optional<string>;
    ThumbImageItemId: Optional<string>;
    BackdropImageTag: Optional<string>;
    BackdropImageItemId: Optional<string>;
    Type: Optional<string>;
    IsFolder: Optional<boolean>;
    RunTimeTicks: Optional<number>;
    MediaType: Optional<string>;
    StartDate: Optional<Date>;
    EndDate: Optional<Date>;
    Series: Optional<string>;
    Status: Optional<string>;
    Album: Optional<string>;
    AlbumId: Optional<string>;
    AlbumArtist: Optional<string>;
    Artists: Optional<string[]>;
    SongCount: Optional<number>;
    EpisodeCount: Optional<number>;
    ChannelId: Guid;
    ChannelName: Optional<string>;
    PrimaryImageAspectRatio: Optional<number>;
    ServerId?: string;
}
