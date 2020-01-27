import ApiClient from "./apiclient";
import { AppStorage } from "./appStorage";
import LocalAssetManager from "./localassetmanager";
import { Item, Optional, UrlOptions } from "./types";
import { rj } from "./utils";

const localPrefix = "local:";
const localViewPrefix = "localview:";

function isLocalId(str: any) {
    if (typeof str !== "string") {
        return false;
    }
    return startsWith(str, localPrefix);
}

function isLocalViewId(str: any) {
    if (typeof str !== "string") {
        return false;
    }
    return startsWith(str, localViewPrefix);
}

function isTopLevelLocalViewId(str: string) {
    return str === "localview";
}

function stripLocalPrefix(str: string) {
    let res = stripStart(str, localPrefix);
    res = stripStart(res, localViewPrefix);

    return res;
}

function startsWith(str: null | undefined, find: Optional<string>): false;
function startsWith(str: Optional<string>, find: null | undefined): false;
function startsWith(str: Optional<string>, find: Optional<string>): boolean;
function startsWith(str: Optional<string>, find: Optional<string>): boolean {
    if (str && find) {
        return str.startsWith(find);
    }

    return false;
}

function stripStart<T extends Optional<string>>(
    str: T,
    find: Optional<string>
): T {
    if (startsWith(str, find)) {
        return str!.substr(find!.length) as any;
    }

    return str;
}

function createEmptyList() {
    return {
        Items: [],
        TotalRecordCount: 0
    };
}

function convertGuidToLocal(guid: null | undefined): null;
function convertGuidToLocal(guid: string): string;
function convertGuidToLocal(guid: Optional<string>): string | null;
function convertGuidToLocal(guid: Optional<string>): string | null {
    if (!guid) {
        return null;
    }

    if (isLocalId(guid)) {
        return guid;
    }

    return `local:${guid}`;
}

function adjustGuidProperties(downloadedItem: Item) {
    downloadedItem.Id = convertGuidToLocal(downloadedItem.Id);
    downloadedItem.SeriesId = convertGuidToLocal(downloadedItem.SeriesId);
    downloadedItem.SeasonId = convertGuidToLocal(downloadedItem.SeasonId);

    downloadedItem.AlbumId = convertGuidToLocal(downloadedItem.AlbumId);
    downloadedItem.ParentId = convertGuidToLocal(downloadedItem.ParentId);
    downloadedItem.ParentThumbItemId = convertGuidToLocal(
        downloadedItem.ParentThumbItemId
    );
    downloadedItem.ParentPrimaryImageItemId = convertGuidToLocal(
        downloadedItem.ParentPrimaryImageItemId
    );
    downloadedItem.PrimaryImageItemId = convertGuidToLocal(
        downloadedItem.PrimaryImageItemId
    );
    downloadedItem.ParentLogoItemId = convertGuidToLocal(
        downloadedItem.ParentLogoItemId
    );
    downloadedItem.ParentBackdropItemId = convertGuidToLocal(
        downloadedItem.ParentBackdropItemId
    );

    downloadedItem.ParentBackdropImageTags = null;
}

/**
 * Creates a new api client instance
 * @param {String} serverAddress
 * @param {String} clientName s
 * @param {String} applicationVersion
 */
class ApiClientEx extends ApiClient {
    private localAssetManager: typeof LocalAssetManager;

    constructor(
        appStorage: AppStorage,
        serverAddress: string,
        clientName: string,
        applicationVersion: string,
        deviceName: string,
        deviceId: string,
        devicePixelRatio: number,
        localAssetManager: typeof LocalAssetManager
    ) {
        super(
            appStorage,
            serverAddress,
            clientName,
            applicationVersion,
            deviceName,
            deviceId,
            devicePixelRatio
        );
        this.localAssetManager = localAssetManager;
    }

    public getPlaybackInfo(
        itemId: string,
        options: UrlOptions,
        deviceProfile: any
    ) {
        const sid = this.requireServerInfo.Id;

        const onFailure = () =>
            super.getPlaybackInfo(itemId, options, deviceProfile);

        if (isLocalId(itemId)) {
            return this.localAssetManager
                .getLocalItem(sid!!, stripLocalPrefix(itemId))
                .then(item => {
                    // TODO: This was already done during the sync process, right? If so, remove it
                    const mediaSources = item.Item.MediaSources.map(m => {
                        m.SupportsDirectPlay = true;
                        m.SupportsDirectStream = false;
                        m.SupportsTranscoding = false;
                        m.IsLocal = true;
                        return m;
                    });

                    return {
                        MediaSources: mediaSources
                    };
                }, onFailure);
        }

        const instance = this;
        return this.localAssetManager.getLocalItem(sid!!, itemId).then(item => {
            if (item) {
                const mediaSources = item.Item.MediaSources.map(m => {
                    m.SupportsDirectPlay = true;
                    m.SupportsDirectStream = false;
                    m.SupportsTranscoding = false;
                    m.IsLocal = true;
                    return m;
                });

                return instance.localAssetManager
                    .fileExists(item.LocalPath)
                    .then(exists => {
                        if (exists) {
                            const res = {
                                MediaSources: mediaSources
                            };

                            return Promise.resolve(res);
                        }

                        return ApiClient.prototype.getPlaybackInfo.call(
                            instance,
                            itemId,
                            options,
                            deviceProfile
                        );
                    }, onFailure);
            }

            return ApiClient.prototype.getPlaybackInfo.call(
                instance,
                itemId,
                options,
                deviceProfile
            );
        }, onFailure);
    }

    public getItems(userId: string, options: UrlOptions = {}) {
        const serverInfo = this.serverInfo;
        let i;

        if (serverInfo && options.ParentId === "localview") {
            return this.getLocalFolders(serverInfo.Id).then(items => {
                const result = {
                    Items: items,
                    TotalRecordCount: items.length
                };

                return Promise.resolve(result);
            });
        } else if (
            serverInfo &&
            options &&
            (isLocalId(options.ParentId) ||
                isLocalId(options.SeriesId) ||
                isLocalId(options.SeasonId) ||
                isLocalViewId(options.ParentId) ||
                isLocalId(options.AlbumIds))
        ) {
            return this.localAssetManager
                .getViewItems(serverInfo.Id, userId, options)
                .then(items => {
                    items.forEach(item => {
                        adjustGuidProperties(item);
                    });

                    const result = {
                        Items: items,
                        TotalRecordCount: items.length
                    };

                    return Promise.resolve(result);
                });
        } else if (
            options &&
            options.ExcludeItemIds &&
            options.ExcludeItemIds.length
        ) {
            const exItems = options.ExcludeItemIds.split(",");

            for (i = 0; i < exItems.length; i++) {
                if (isLocalId(exItems[i])) {
                    return Promise.resolve(createEmptyList());
                }
            }
        } else if (options && options.Ids && options.Ids.length) {
            const ids = options.Ids.split(",");
            let hasLocal = false;

            for (i = 0; i < ids.length; i++) {
                if (isLocalId(ids[i])) {
                    hasLocal = true;
                }
            }

            if (hasLocal) {
                return this.localAssetManager
                    .getItemsFromIds(serverInfo.Id, ids)
                    .then(items => {
                        items.forEach(item => {
                            adjustGuidProperties(item);
                        });

                        const result = {
                            Items: items,
                            TotalRecordCount: items.length
                        };

                        return Promise.resolve(result);
                    });
            }
        }

        return super.getItems(userId, options);
    }

    public getUserViews(options, userId) {
        const instance = this;

        options = options || {};

        const basePromise = ApiClient.prototype.getUserViews.call(
            instance,
            options,
            userId
        );

        if (!options.enableLocalView) {
            return basePromise;
        }

        return basePromise.then(result => {
            const serverInfo = instance.serverInfo();
            if (serverInfo) {
                return getLocalView(instance, serverInfo.Id, userId).then(
                    localView => {
                        if (localView) {
                            result.Items.push(localView);
                            result.TotalRecordCount++;
                        }

                        return Promise.resolve(result);
                    }
                );
            }

            return Promise.resolve(result);
        });
    }

    public getItem(userId, itemId) {
        if (!itemId) {
            throw new Error("null itemId");
        }

        if (itemId) {
            itemId = itemId.toString();
        }

        let serverInfo;

        if (isTopLevelLocalViewId(itemId)) {
            serverInfo = this.serverInfo();

            if (serverInfo) {
                return getLocalView(this, serverInfo.Id, userId);
            }
        }

        if (isLocalViewId(itemId)) {
            serverInfo = this.serverInfo();

            if (serverInfo) {
                return this.getLocalFolders(serverInfo.Id, userId).then(
                    items => {
                        const views = items.filter(item => item.Id === itemId);

                        if (views.length > 0) {
                            return Promise.resolve(views[0]);
                        }

                        // TODO: Test consequence of this
                        return Promise.reject();
                    }
                );
            }
        }

        if (isLocalId(itemId)) {
            serverInfo = this.serverInfo();

            if (serverInfo) {
                return this.localAssetManager
                    .getLocalItem(serverInfo.Id, stripLocalPrefix(itemId))
                    .then(item => {
                        adjustGuidProperties(item.Item);

                        return Promise.resolve(item.Item);
                    });
            }
        }

        return ApiClient.prototype.getItem.call(this, userId, itemId);
    }

    public getLocalFolders(userId?: string) {
        const serverInfo = this.requireServerInfo;
        userId = userId || serverInfo.UserId;

        return this.localAssetManager.getViews(serverInfo.Id, userId);
    }

    public getNextUpEpisodes(options: UrlOptions) {
        if (options.SeriesId) {
            if (typeof options.SeriesId !== "string") {
                return rj("SeriesId has to be a string");
            }
            if (isLocalId(options.SeriesId)) {
                return Promise.resolve(createEmptyList());
            }
        }

        return super.getNextUpEpisodes(options);
    }

    public getSeasons(itemId: string, options: UrlOptions = {}) {
        if (isLocalId(itemId)) {
            options.SeriesId = itemId;
            options.IncludeItemTypes = "Season";
            return this.getItems(this.requireUserId(), options);
        }

        return super.getSeasons(itemId, options);
    }

    public getEpisodes(itemId: string, options: UrlOptions) {
        if (isLocalId(options.SeasonId) || isLocalId(options.seasonId)) {
            options.SeriesId = itemId;
            options.IncludeItemTypes = "Episode";
            return this.getItems(this.requireUserId(), options);
        }

        // get episodes by recursion
        if (isLocalId(itemId)) {
            options.SeriesId = itemId;
            options.IncludeItemTypes = "Episode";
            return this.getItems(this.requireUserId(), options);
        }

        return ApiClient.prototype.getEpisodes.call(this, itemId, options);
    }

    public getLatestOfflineItems(options: {
        MediaType?: "Audio" | "Video" | "Photo" | "Book" | "Game";
        Limit?: number;
        Filters?: ["IsNotFolder"] | ["IsFolder"];
    } & UrlOptions = {}) {
        // Supported options
        // MediaType - Audio/Video/Photo/Book/Game
        // Limit
        // Filters: 'IsNotFolder' or 'IsFolder'

        options.SortBy = "DateCreated";
        options.SortOrder = "Descending";

        const serverInfo = this.serverInfo;

        if (serverInfo) {
            return this.localAssetManager
                .getViewItems(serverInfo.Id, null, options)
                .then(items => {
                    items.forEach(item => {
                        adjustGuidProperties(item);
                    });

                    return Promise.resolve(items);
                });
        }

        return Promise.resolve([]);
    }

    public getThemeMedia(userId, itemId, inherit) {
        if (
            isLocalViewId(itemId) ||
            isLocalId(itemId) ||
            isTopLevelLocalViewId(itemId)
        ) {
            return Promise.reject();
        }

        return ApiClient.prototype.getThemeMedia.call(
            this,
            userId,
            itemId,
            inherit
        );
    }

    public getSpecialFeatures(userId, itemId) {
        if (isLocalId(itemId)) {
            return Promise.resolve([]);
        }

        return ApiClient.prototype.getSpecialFeatures.call(
            this,
            userId,
            itemId
        );
    }

    public getSimilarItems(itemId, options) {
        if (isLocalId(itemId)) {
            return Promise.resolve(createEmptyList());
        }

        return ApiClient.prototype.getSimilarItems.call(this, itemId, options);
    }

    public updateFavoriteStatus(userId, itemId, isFavorite) {
        if (isLocalId(itemId)) {
            return Promise.resolve();
        }

        return ApiClient.prototype.updateFavoriteStatus.call(
            this,
            userId,
            itemId,
            isFavorite
        );
    }

    public getScaledImageUrl(itemId, options) {
        if (
            isLocalId(itemId) ||
            (options && options.itemid && isLocalId(options.itemid))
        ) {
            const serverInfo = this.serverInfo();
            const id = stripLocalPrefix(itemId);

            return this.localAssetManager.getImageUrl(
                serverInfo.Id,
                id,
                options
            );
        }

        return ApiClient.prototype.getScaledImageUrl.call(
            this,
            itemId,
            options
        );
    }

    public reportPlaybackStart(options) {
        if (!options) {
            throw new Error("null options");
        }

        if (isLocalId(options.ItemId)) {
            return Promise.resolve();
        }

        return ApiClient.prototype.reportPlaybackStart.call(this, options);
    }

    public reportPlaybackProgress(options) {
        if (!options) {
            throw new Error("null options");
        }

        if (isLocalId(options.ItemId)) {
            const serverInfo = this.serverInfo();

            if (serverInfo) {
                const instance = this;
                return this.localAssetManager
                    .getLocalItem(
                        serverInfo.Id,
                        stripLocalPrefix(options.ItemId)
                    )
                    .then(item => {
                        const libraryItem = item.Item;

                        if (
                            libraryItem.MediaType === "Video" ||
                            libraryItem.Type === "AudioBook"
                        ) {
                            libraryItem.UserData = libraryItem.UserData || {};
                            libraryItem.UserData.PlaybackPositionTicks =
                                options.PositionTicks;
                            libraryItem.UserData.PlayedPercentage = Math.min(
                                libraryItem.RunTimeTicks
                                    ? 100 *
                                          ((options.PositionTicks || 0) /
                                              libraryItem.RunTimeTicks)
                                    : 0,
                                100
                            );
                            return instance.localAssetManager.addOrUpdateLocalItem(
                                item
                            );
                        }

                        return Promise.resolve();
                    });
            }

            return Promise.resolve();
        }

        return ApiClient.prototype.reportPlaybackProgress.call(this, options);
    }

    public reportPlaybackStopped(options) {
        if (!options) {
            throw new Error("null options");
        }

        if (isLocalId(options.ItemId)) {
            const serverInfo = this.serverInfo();

            const action = {
                Date: new Date().getTime(),
                ItemId: stripLocalPrefix(options.ItemId),
                PositionTicks: options.PositionTicks,
                ServerId: serverInfo.Id,
                Type: 0, // UserActionType.PlayedItem
                UserId: this.getCurrentUserId()
            };

            return this.localAssetManager.recordUserAction(action);
        }

        return ApiClient.prototype.reportPlaybackStopped.call(this, options);
    }

    public getIntros(itemId) {
        if (isLocalId(itemId)) {
            return Promise.resolve({
                Items: [],
                TotalRecordCount: 0
            });
        }

        return ApiClient.prototype.getIntros.call(this, itemId);
    }

    public getInstantMixFromItem(itemId, options) {
        if (isLocalId(itemId)) {
            return Promise.resolve({
                Items: [],
                TotalRecordCount: 0
            });
        }

        return ApiClient.prototype.getInstantMixFromItem.call(
            this,
            itemId,
            options
        );
    }

    public getItemDownloadUrl(itemId) {
        if (isLocalId(itemId)) {
            const serverInfo = this.serverInfo();

            if (serverInfo) {
                return this.localAssetManager
                    .getLocalItem(serverInfo.Id, stripLocalPrefix(itemId))
                    .then(item => Promise.resolve(item.LocalPath));
            }
        }

        return ApiClient.prototype.getItemDownloadUrl.call(this, itemId);
    }

    private getLocalView(serverId, userId) {
        return this.getLocalFolders(serverId, userId).then(views => {
            let localView = null;

            if (views.length > 0) {
                localView = {
                    Name: instance.downloadsTitleText || "Downloads",
                    ServerId: serverId,
                    Id: "localview",
                    Type: "localview",
                    IsFolder: true
                };
            }

            return Promise.resolve(localView);
        });
    }
}

export default ApiClientEx;
