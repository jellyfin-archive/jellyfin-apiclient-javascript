import { Optional } from "../../types";
import { MediaPathInfo } from "./MediaPathInfo";
import { TypeOptions } from "./TypeOptions";

export interface LibraryOptions {
    EnablePhotos: boolean;
    EnableRealtimeMonitor: boolean;
    EnableChapterImageExtraction: boolean;
    ExtractChapterImagesDuringLibraryScan: boolean;
    DownloadImagesInAdvance: boolean;
    PathInfos: MediaPathInfo[];
    SaveLocalMetadata: boolean;
    EnableInternetProviders: boolean;
    ImportMissingEpisodes: boolean;
    EnableAutomaticSeriesGrouping: boolean;
    EnableEmbeddedTitles: boolean;
    AutomaticRefreshIntervalDays: number;
    PreferredMetadataLanguage: Optional<string>;
    MetadataCountryCode: Optional<string>;
    SeasonZeroDisplayName: Optional<string>;
    MetadataSavers: Optional<string[]>;
    DisabledLocalMetadataReaders: string[];
    LocalMetadataReaderOrder: Optional<string[]>;
    DisabledSubtitleFetchers: string[];
    SubtitleFetcherOrder: string[];
    SkipSubtitlesIfEmbeddedSubtitlesPresent: boolean;
    SkipSubtitlesIfAudioTrackMatches: boolean;
    SubtitleDownloadLanguages: Optional<string[]>;
    RequirePerfectSubtitleMatch: boolean;
    SaveSubtitlesWithMedia: boolean;
    TypeOptions: TypeOptions[];
}
