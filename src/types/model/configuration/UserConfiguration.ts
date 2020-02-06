import { Optional } from "../../types";
import { SubtitlePlaybackMode } from "./SubtitlePlaybackMode";

export interface UserConfiguration {
    AudioLanguagePreference: Optional<string>;
    PlayDefaultAudioTrack: boolean;
    SubtitleLanguagePreference: Optional<string>;
    DisplayMissingEpisodes: boolean;
    GroupedFolders: string[];
    SubtitleMode: SubtitlePlaybackMode;
    DisplayCollectionsView: boolean;
    EnableLocalPassword: boolean;
    OrderedViews: string[];
    LatestItemsExcludes: string[];
    MyMediaExcludes: string[];
    HidePlayedInLatest: boolean;
    RememberAudioSelections: boolean;
    RememberSubtitleSelections: boolean;
    EnableNextEpisodeAutoPlay: boolean;
}
