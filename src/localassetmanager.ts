import filerepository from "src/sync/filerepository";
import itemrepository from "src/sync/itemrepository";
import transfermanager from "src/sync/transfermanager";
import useractionrepository from "src/sync/useractionrepository";
import { Item, Optional, SyncedItem, UrlOptions } from "./types";

export interface LocalAssetManager {
    downloadSubtitles(url, fileName): Promise<never>;

    getItemFileSize(path): Promise<number>;

    hasImage(serverId, itemId, imageType, index): Promise<void | boolean>;

    fileExists(localFilePath: string): Promise<boolean>;

    recordUserAction(action): Promise<unknown>;

    getViewItems(
        serverId: string,
        userId: string,
        options: UrlOptions
    ): Promise<Item[]>;

    getImageUrl(serverId, itemId, imageOptions): string;

    removeObsoleteContainerItems(serverId): Promise<void>;

    getDirectoryPath(item): any[];

    getDownloadItemCount(): Promise<number>;

    deleteUserActions(actions): Promise<void[]>;

    addOrUpdateLocalItem(localItem): Promise<unknown>;

    downloadImage(
        localItem,
        url,
        serverId,
        itemId,
        imageType,
        index
    ): Promise<never>;

    resyncTransfers(): Promise<void>;

    isDownloadFileInQueue(path): any;

    getUserActions(serverId): Promise<Int32Array>;

    getLocalFileName(item, originalFileName): string[];

    getServerItems(serverId): Promise<unknown>;

    downloadFile(url, localItem): Promise<never>;

    deleteUserAction(action): Promise<unknown>;

    getViews(serverId, userId): Promise<any[]>;

    enableBackgroundCompletion(): any;

    getLocalItem(serverId: string, itemId: string): Promise<SyncedItem>;

    removeLocalItem(localItem): Promise<unknown>;

    getItemsFromIds(serverId, ids): Promise<unknown[]>;

    getSubtitleSaveFileName(
        localItem,
        mediaPath,
        language,
        isForced,
        format
    ): any;
}

function getLocalItem(serverId: string, itemId: string) {
    console.log("[lcoalassetmanager] Begin getLocalItem");

    return itemrepository.get(serverId, itemId);
}

function recordUserAction(action) {
    action.Id = createGuid();
    return useractionrepository.set(action.Id, action);
}

function getUserActions(serverId: string) {
    return useractionrepository.getByServerId(serverId);
}

function deleteUserAction(action) {
    return useractionrepository.remove(action.Id);
}

function deleteUserActions(actions) {
    const results = [];

    actions.forEach(action => {
        results.push(deleteUserAction(action));
    });

    return Promise.all(results);
}

function getServerItems(serverId: string) {
    console.info("[localassetmanager] Begin getServerItems");

    return itemrepository.getAll(serverId);
}

function getItemsFromIds(serverId: string, ids: string[]) {
    const actions = ids.map(id => {
        const strippedId = stripStart(id, "local:");

        return getLocalItem(serverId, strippedId);
    });

    return Promise.all(actions).then(items => {
        const libItems = items.map(locItem => locItem.Item);

        return Promise.resolve(libItems);
    });
}

function getViews(serverId: string, userId: string) {
    return itemrepository.getServerItemTypes(serverId, userId).then(types => {
        const list = [];
        let item;

        if (types.includes("Audio")) {
            item = {
                Name: "Music",
                ServerId: serverId,
                Id: "localview:MusicView",
                Type: "MusicView",
                CollectionType: "music",
                IsFolder: true
            };

            list.push(item);
        }

        if (types.includes("Photo")) {
            item = {
                Name: "Photos",
                ServerId: serverId,
                Id: "localview:PhotosView",
                Type: "PhotosView",
                CollectionType: "photos",
                IsFolder: true
            };

            list.push(item);
        }

        if (types.includes("Episode")) {
            item = {
                Name: "TV",
                ServerId: serverId,
                Id: "localview:TVView",
                Type: "TVView",
                CollectionType: "tvshows",
                IsFolder: true
            };

            list.push(item);
        }

        if (types.includes("Movie")) {
            item = {
                Name: "Movies",
                ServerId: serverId,
                Id: "localview:MoviesView",
                Type: "MoviesView",
                CollectionType: "movies",
                IsFolder: true
            };

            list.push(item);
        }

        if (types.includes("Video")) {
            item = {
                Name: "Videos",
                ServerId: serverId,
                Id: "localview:VideosView",
                Type: "VideosView",
                CollectionType: "videos",
                IsFolder: true
            };

            list.push(item);
        }

        if (types.includes("MusicVideo")) {
            item = {
                Name: "Music Videos",
                ServerId: serverId,
                Id: "localview:MusicVideosView",
                Type: "MusicVideosView",
                CollectionType: "videos",
                IsFolder: true
            };

            list.push(item);
        }

        return Promise.resolve(list);
    });
}

function updateFiltersForTopLevelView(
    parentId: string,
    mediaTypes: any, // TODO: Can't this be removed?
    includeItemTypes: string[],
    query: { Recursive?: boolean } = {}
) {
    switch (parentId) {
        case "MusicView":
            if (query.Recursive) {
                includeItemTypes.push("Audio");
            } else {
                includeItemTypes.push("MusicAlbum");
            }
            return true;
        case "PhotosView":
            if (query.Recursive) {
                includeItemTypes.push("Photo");
            } else {
                includeItemTypes.push("PhotoAlbum");
            }
            return true;
        case "TVView":
            if (query.Recursive) {
                includeItemTypes.push("Episode");
            } else {
                includeItemTypes.push("Series");
            }
            return true;
        case "VideosView":
            if (query.Recursive) {
                includeItemTypes.push("Video");
            } else {
                includeItemTypes.push("Video");
            }
            return true;
        case "MoviesView":
            if (query.Recursive) {
                includeItemTypes.push("Movie");
            } else {
                includeItemTypes.push("Movie");
            }
            return true;
        case "MusicVideosView":
            if (query.Recursive) {
                includeItemTypes.push("MusicVideo");
            } else {
                includeItemTypes.push("MusicVideo");
            }
            return true;
    }
    return false;
}

function normalizeId(id: any) {
    if (typeof id !== "string") {
        return null;
    }
    id = stripStart(id, "localview:");
    id = stripStart(id, "local:");
    return id;
}

function normalizeIdList(val: any) {
    if (typeof val !== "string") {
        return [];
    }
    return val.split(",").map(normalizeId);
}

function shuffle<T>(array: T[]): T[] {
    let currentIndex = array.length;
    let temporaryValue;
    let randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function sortItems(items: Item[], query: { sortBy?: string } = {}) {
    const sortBy = (query.sortBy || "").split(",")[0];

    if (sortBy === "DateCreated") {
        items.sort((a, b) => compareDates(a.DateCreated, b.DateCreated));
    } else if (sortBy === "Random") {
        items = shuffle(items);
    } else {
        items.sort((a, b) =>
            a.SortName.toLowerCase().localeCompare(b.SortName.toLowerCase())
        );
    }

    return items;
}

function splitCSL(str: any) {
    if (typeof str !== "string") {
        return [];
    }
    return str.split(",");
}

async function getViewItems(
    serverId: string,
    userId: string,
    options: UrlOptions
): Promise<Item[]> {
    let parentId = options.ParentId;

    parentId = normalizeId(parentId);
    const seasonId = normalizeId(options.SeasonId || options.seasonId);
    const seriesId = normalizeId(options.SeriesId || options.seriesId);
    const albumIds = normalizeIdList(options.AlbumIds || options.albumIds);

    const includeItemTypes = splitCSL(options.IncludeItemTypes);
    const filters = splitCSL(options.Filters);
    const mediaTypes = splitCSL(options.MediaTypes);

    if (
        updateFiltersForTopLevelView(
            parentId,
            mediaTypes,
            includeItemTypes,
            options
        )
    ) {
        parentId = null;
    }

    const items = await getServerItems(serverId);
    // debugPrintItems(items);

    let resultItems = items
        .filter(item => {
            if (item.SyncStatus && item.SyncStatus !== "synced") {
                return false;
            }

            if (mediaTypes.length) {
                if (!mediaTypes.includes(item.Item.MediaType || "")) {
                    return false;
                }
            }

            if (seriesId && item.Item.SeriesId !== seriesId) {
                return false;
            }

            if (seasonId && item.Item.SeasonId !== seasonId) {
                return false;
            }

            if (
                albumIds.length &&
                !albumIds.includes(item.Item.AlbumId || "")
            ) {
                return false;
            }

            if (item.Item.IsFolder && filters.includes("IsNotFolder")) {
                return false;
            } else if (!item.Item.IsFolder && filters.includes("IsFolder")) {
                return false;
            }

            if (includeItemTypes.length) {
                if (!includeItemTypes.includes(item.Item.Type || "")) {
                    return false;
                }
            }

            if (options.Recursive) {
            } else {
                if (parentId && item.Item.ParentId !== parentId) {
                    return false;
                }
            }

            return true;
        })
        .map(item => item.Item);

    resultItems = sortItems(resultItems, options);

    if (options.Limit) {
        if (typeof options.Limit !== "number") {
            throw new TypeError("Limit has to be a number");
        }
        resultItems = resultItems.slice(0, options.Limit);
    }

    return resultItems;
}

async function removeObsoleteContainerItems(serverId: string) {
    const items = await getServerItems(serverId);
    const seriesItems = items.filter(item => {
        const type = (item.Item.Type || "").toLowerCase();
        return type === "series";
    });

    const seasonItems = items.filter(item => {
        const type = (item.Item.Type || "").toLowerCase();
        return type === "season";
    });

    const albumItems = items.filter(item => {
        const type = (item.Item.Type || "").toLowerCase();
        return type === "musicalbum" || type === "photoalbum";
    });

    const requiredSeriesIds = items
        .filter(item => {
            const type = (item.Item.Type || "").toLowerCase();
            return type === "episode";
        })
        .map(item2 => item2.Item.SeriesId)
        .filter(filterDistinct);

    const requiredSeasonIds = items
        .filter(item => {
            const type = (item.Item.Type || "").toLowerCase();
            return type === "episode";
        })
        .map(item2 => item2.Item.SeasonId)
        .filter(filterDistinct);

    const requiredAlbumIds = items
        .filter(item => {
            const type = (item.Item.Type || "").toLowerCase();
            return type === "audio" || type === "photo";
        })
        .map(item2 => item2.Item.AlbumId)
        .filter(filterDistinct);

    const obsoleteItems: SyncedItem[] = [];

    seriesItems.forEach(item => {
        if (!requiredSeriesIds.includes(item.Item.Id)) {
            obsoleteItems.push(item);
        }
    });

    seasonItems.forEach(item => {
        if (!requiredSeasonIds.includes(item.Item.Id)) {
            obsoleteItems.push(item);
        }
    });

    albumItems.forEach(item => {
        if (!requiredAlbumIds.includes(item.Item.Id)) {
            obsoleteItems.push(item);
        }
    });

    let p = Promise.resolve();

    obsoleteItems.forEach(item => {
        p = p.then(() => itemrepository.remove(item.ServerId, item.Id));
    });

    return p;
}

function removeLocalItem(localItem) {
    return itemrepository.get(localItem.ServerId, localItem.Id).then(item => {
        const onFileDeletedSuccessOrFail = () =>
            itemrepository.remove(localItem.ServerId, localItem.Id);

        if (!item.LocalPath) {
            return onFileDeletedSuccessOrFail();
        }

        return filerepository
            .deleteFile(item.LocalPath)
            .then(onFileDeletedSuccessOrFail, onFileDeletedSuccessOrFail);
    });
}

function addOrUpdateLocalItem(localItem) {
    return itemrepository.set(localItem.ServerId, localItem.Id, localItem);
}

function getSubtitleSaveFileName(
    localItem,
    mediaPath,
    language,
    isForced,
    format
) {
    let name = getNameWithoutExtension(mediaPath);

    if (language) {
        name += `.${language.toLowerCase()}`;
    }

    if (isForced) {
        name += ".foreign";
    }

    name = `${name}.${format.toLowerCase()}`;

    const mediaFolder = filerepository.getParentPath(localItem.LocalPath);
    const subtitleFileName = filerepository.combinePath(mediaFolder, name);

    return subtitleFileName;
}

function getItemFileSize(path) {
    return filerepository.getItemFileSize(path);
}

function getNameWithoutExtension(path) {
    let fileName = path;

    const pos = fileName.lastIndexOf(".");

    if (pos > 0) {
        fileName = fileName.substring(0, pos);
    }

    return fileName;
}

function downloadFile(url, localItem) {
    const imageUrl = getImageUrl(localItem.Item.ServerId, localItem.Item.Id, {
        type: "Primary",
        index: 0
    });
    return transfermanager.downloadFile(url, localItem, imageUrl);
}

function downloadSubtitles(url, fileName) {
    return transfermanager.downloadSubtitles(url, fileName);
}

function getImageUrl(serverId, itemId, imageOptions) {
    const imageType = imageOptions.type;
    const index = imageOptions.index;

    const pathArray = getImagePath(serverId, itemId, imageType, index);

    return filerepository.getImageUrl(pathArray);
}

function hasImage(serverId, itemId, imageType, index) {
    const pathArray = getImagePath(serverId, itemId, imageType, index);
    const localFilePath = filerepository.getFullMetadataPath(pathArray);

    return filerepository.fileExists(localFilePath).then(
        (
            exists // TODO: Maybe check for broken download when file size is 0 and item is not queued
        ) =>
            //// if (exists) {
            ////    if (!transfermanager.isDownloadFileInQueue(localFilePath)) {
            ////        // If file exists but
            ////        exists = false;
            ////    }
            //// }

            Promise.resolve(exists),
        err => Promise.resolve(false)
    );
}

function fileExists(localFilePath: string) {
    return filerepository.fileExists(localFilePath);
}

function downloadImage(localItem, url, serverId, itemId, imageType, index) {
    const localPathParts = getImagePath(serverId, itemId, imageType, index);

    return transfermanager.downloadImage(url, localPathParts);
}

function isDownloadFileInQueue(path: string) {
    return transfermanager.isDownloadFileInQueue(path);
}

function getDownloadItemCount() {
    return transfermanager.getDownloadItemCount();
}

// Helpers ***********************************************************

function getDirectoryPath(item: Item) {
    const parts = [];

    const itemtype = item.Type.toLowerCase();
    const mediaType = (item.MediaType || "").toLowerCase();

    if (
        itemtype === "episode" ||
        itemtype === "series" ||
        itemtype === "season"
    ) {
        parts.push("TV");
    } else if (mediaType === "video") {
        parts.push("Videos");
    } else if (
        itemtype === "audio" ||
        itemtype === "musicalbum" ||
        itemtype === "musicartist"
    ) {
        parts.push("Music");
    } else if (itemtype === "photo" || itemtype === "photoalbum") {
        parts.push("Photos");
    }

    const albumArtist = item.AlbumArtist;
    if (albumArtist) {
        parts.push(albumArtist);
    }

    const seriesName = item.SeriesName;
    if (seriesName) {
        parts.push(seriesName);
    }

    const seasonName = item.SeasonName;
    if (seasonName) {
        parts.push(seasonName);
    }

    if (item.Album) {
        parts.push(item.Album);
    }

    if ((mediaType === "video" && itemtype !== "episode") || item.IsFolder) {
        parts.push(item.Name);
    }

    const finalParts = [];
    for (const part of parts) {
        finalParts.push(filerepository.getValidFileName(part));
    }

    return finalParts;
}

function getImagePath(
    serverId: string,
    itemId: string,
    imageType: string,
    index: number
) {
    const parts = [];
    parts.push("images");

    index = index || 0;
    // Store without extension. This allows mixed image types since the browser will
    // detect the type from the content
    parts.push(`${itemId}_${imageType}_${index.toString()}`); // + '.jpg');

    const finalParts = [];
    for (const part of parts) {
        finalParts.push(part);
    }

    return finalParts;
}

function getLocalFileName(item: Item, originalFileName?: string) {
    const filename = originalFileName || item.Name;

    return filerepository.getValidFileName(filename);
}

function resyncTransfers() {
    return transfermanager.resyncTransfers();
}

function createGuid() {
    const rand = new Uint8Array(16);
    crypto.getRandomValues(rand);
    const hexlets = Array.from(rand)
        .map(value => {
            // tslint:disable-next-line:no-bitwise
            return [(value & 240) >> 4, value & 15];
        })
        .flat();
    let i = 0;
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = hexlets[i++];
        // tslint:disable-next-line:no-bitwise
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function startsWith(str: Optional<string>, find: null | undefined): false;
function startsWith(str: null | undefined, find: Optional<string>): false;
function startsWith(str: Optional<string>, find: Optional<string>): boolean;
function startsWith(str: Optional<string>, find: Optional<string>): boolean {
    if (str && find && str.length > find.length) {
        return str.startsWith(find);
    }

    return false;
}

function stripStart(str: string, find: string): string;
function stripStart(
    str: Optional<string>,
    find: Optional<string>
): Optional<string>;
function stripStart(
    str: Optional<string>,
    find: Optional<string>
): Optional<string> {
    if (startsWith(str, find)) {
        return str!.substr(find!.length);
    }

    return str;
}

function filterDistinct<T>(value: T, index: number, self: T[]) {
    return self.indexOf(value) === index;
}

function compareDates(da: Date, db: Date) {
    // Compare two dates (could be of any type supported by the convert
    // function above) and returns:
    //  -1 : if a < b
    //   0 : if a = b
    //   1 : if a > b
    // NaN : if a or b is an illegal date
    // NOTE: The code inside isFinite does an assignment (=).
    const a: number = da.valueOf();
    const b: number = db.valueOf();
    return isFinite(a) && isFinite(b) ? Number(a > b) - Number(a < b) : NaN;
}

function debugPrintItems(items: Item[]) {
    console.log("Current local items:");
    console.group();

    items.forEach(item => {
        console.info(
            "ID: %s Type: %s Name: %s",
            item.Item.Id,
            item.Item.Type,
            item.Item.Name
        );
    });

    console.groupEnd();
}

function enableBackgroundCompletion() {
    return transfermanager.enableBackgroundCompletion;
}

const localAssetManager: LocalAssetManager = {
    getLocalItem,
    getDirectoryPath,
    getLocalFileName,
    recordUserAction,
    getUserActions,
    deleteUserAction,
    deleteUserActions,
    removeLocalItem,
    addOrUpdateLocalItem,
    downloadFile,
    downloadSubtitles,
    hasImage,
    downloadImage,
    getImageUrl,
    getSubtitleSaveFileName,
    getServerItems,
    getItemFileSize,
    isDownloadFileInQueue,
    getDownloadItemCount,
    getViews,
    getViewItems,
    resyncTransfers,
    getItemsFromIds,
    removeObsoleteContainerItems,
    fileExists,
    enableBackgroundCompletion
};

export default localAssetManager;
