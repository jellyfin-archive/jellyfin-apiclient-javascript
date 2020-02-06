import { Optional } from "../../types";
import { ScrollDirection } from "./ScrollDirection";
import { SortOrder } from "./SortOrder";

export interface DisplayPreferences {
    Id: Optional<string>;
    ViewType: Optional<string>;
    SortBy: Optional<string>;
    IndexBy: Optional<string>;
    RememberIndexing: boolean;
    PrimaryImageHeight: number;
    PrimaryImageWidth: number;
    CustomPrefs: Record<string, string>;
    ScrollDirection: ScrollDirection;
    ShowBackdrop: boolean;
    RememberSorting: boolean;
    SortOrder: SortOrder;
    ShowSidebar: boolean;
    Client: Optional<string>;
}
