import ApiClient from "./apiclient";
import { AppStorage } from "./appStorage";
import LocalAssetManager from "./localassetmanager";
import {
    AllThemeMediaResult,
    BaseItemDto,
    BaseItemsRequest,
    GetEpisodes,
    GetNextUpEpisodes,
    GetPlaybackInfo,
    GetSeasons,
    GetSimilarItems,
    GetUserViews,
    ImageRequest,
    MediaType,
    Optional,
    PlaybackInfoResponse,
    PlaybackProgressInfo,
    PlaybackStartInfo,
    PlaybackStopInfo,
    QueryResult,
    UserAction,
    UserActionType
} from "./types";
import { assertNotNullish } from "./utils";

const localPrefix = "local:";
const localViewPrefix = "localview:";

function isLocalId(str: Optional<string>) {
    if (typeof str !== "string") {
        return false;
    }
    return startsWith(str, localPrefix);
}

function isLocalViewId(str: Optional<string>) {
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

export interface GetUserViewsLocalOptions extends GetUserViews {
    EnableLocalView?: Optional<boolean>;
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

function createEmptyList(): QueryResult<any> {
    return {
        Items: [],
        TotalRecordCount: 0,
        StartIndex: 0
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

function adjustGuidProperties(downloadedItem: BaseItemDto) {
    downloadedItem.Id = convertGuidToLocal(downloadedItem.Id)!;
    downloadedItem.SeriesId = convertGuidToLocal(downloadedItem.SeriesId)!;
    downloadedItem.SeasonId = convertGuidToLocal(downloadedItem.SeasonId)!;

    downloadedItem.AlbumId = convertGuidToLocal(downloadedItem.AlbumId)!;
    downloadedItem.ParentId = convertGuidToLocal(downloadedItem.ParentId)!;
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

class ApiClientEx extends ApiClient {
    public downloadsTitleText: string = "Downloads";
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

    public async getPlaybackInfo(
        itemId: string,
        options: GetPlaybackInfo = {}
    ): Promise<PlaybackInfoResponse> {
        assertNotNullish("itemId", itemId);

        const sid = this.serverInfo?.Id;
        assertNotNullish("sid", sid);

        try {
            if (isLocalId(itemId)) {
                const item = await this.localAssetManager.getLocalItem(
                    sid,
                    stripLocalPrefix(itemId)
                );
                // TODO: This was already done during the sync process, right? If so, remove it
                const mediaSources = item.Item.MediaSources.map(m => {
                    m.SupportsDirectPlay = true;
                    m.SupportsDirectStream = false;
                    m.SupportsTranscoding = false;
                    m.IsLocal = true;
                    return m;
                });

                return {
                    MediaSources: mediaSources,
                    PlaySessionId: null,
                    ErrorCode: null
                };
            }

            const item = await this.localAssetManager.getLocalItem(sid, itemId);
            if (item) {
                const mediaSources = item.Item?.MediaSources!.map(m => {
                    m.SupportsDirectPlay = true;
                    m.SupportsDirectStream = false;
                    m.SupportsTranscoding = false;
                    m.IsLocal = true;
                    return m;
                });

                const exists = await this.localAssetManager.fileExists(
                    item.LocalPath!
                );
                if (exists) {
                    return {
                        MediaSources: mediaSources,
                        PlaySessionId: null,
                        ErrorCode: null
                    };
                }
            }

            return super.getPlaybackInfo(itemId, options);
        } catch (err) {
            return super.getPlaybackInfo(itemId, options);
        }
    }

    public getItems(
        userId: Optional<string>,
        options: BaseItemsRequest = {}
    ): Promise<QueryResult<BaseItemDto>> {
        const serverInfo = this.serverInfo;

        let i;

        if (serverInfo && options.ParentId === "localview") {
            return this.getLocalFolders(serverInfo.Id!).then(items => {
                const result: QueryResult<BaseItemDto> = {
                    Items: items,
                    TotalRecordCount: items.length,
                    StartIndex: 0
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
                .getViewItems(serverInfo.Id!, userId, options)
                .then(items => {
                    items.forEach(item => {
                        adjustGuidProperties(item);
                    });

                    const result: QueryResult<BaseItemDto> = {
                        Items: items,
                        TotalRecordCount: items.length,
                        StartIndex: 0
                    };

                    return Promise.resolve(result);
                });
        } else if (
            options &&
            options.ExcludeItemIds &&
            typeof options.ExcludeItemIds === "string"
        ) {
            const exItems = options.ExcludeItemIds.split(",");

            for (i = 0; i < exItems.length; i++) {
                if (isLocalId(exItems[i])) {
                    return Promise.resolve(createEmptyList());
                }
            }
        } else if (options && options.Ids && typeof options.Ids === "string") {
            const ids = options.Ids.split(",");
            let hasLocal = false;

            for (i = 0; i < ids.length; i++) {
                if (isLocalId(ids[i])) {
                    hasLocal = true;
                }
            }

            if (hasLocal) {
                return this.localAssetManager
                    .getItemsFromIds(serverInfo!.Id!, ids)
                    .then(items => {
                        items.forEach(adjustGuidProperties);

                        const result: QueryResult<BaseItemDto> = {
                            Items: items,
                            TotalRecordCount: items.length,
                            StartIndex: 0
                        };

                        return Promise.resolve(result);
                    });
            }
        }

        return super.getItems(userId, options);
    }

    public async getUserViews(
        options: GetUserViewsLocal,
        userId: string
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("userId", userId);

        const result = await super.getUserViews(options, userId);

        if (options.EnableLocalView && this.serverInfo) {
            const localView = await this.getLocalView(userId).catch();
            if (localView) {
                result.Items.push(localView);
                result.TotalRecordCount++;
            }
        }

        return result;
    }

    public async getItem(
        userId: Optional<string>,
        itemId: string
    ): Promise<BaseItemDto> {
        assertNotNullish("itemId", itemId);

        if (itemId) {
            itemId = itemId.toString();
        }

        if (isTopLevelLocalViewId(itemId)) {
            return this.getLocalView(userId);
        }

        if (isLocalViewId(itemId)) {
            const items = await this.getLocalFolders(userId);
            const views = items.filter(item => item.Id === itemId);
            if (views.length > 0) {
                return views[0];
            }

            // TODO: Test consequence of this
            throw new Error();
        }

        if (isLocalId(itemId)) {
            const item = await this.localAssetManager.getLocalItem(
                this.requireServerInfo.Id!,
                stripLocalPrefix(itemId)
            );
            adjustGuidProperties(item.Item);
            return item.Item;
        }

        return super.getItem(userId, itemId);
    }

    public getLocalFolders(userId?: Optional<string>): Promise<BaseItemDto[]> {
        const serverInfo = this.requireServerInfo;
        assertNotNullish("serverInfo.Id", serverInfo.Id);

        userId = userId || serverInfo.UserId;
        assertNotNullish("userId", userId);

        return this.localAssetManager.getViews(serverInfo.Id, userId);
    }

    public async getNextUpEpisodes(
        options?: GetNextUpEpisodes
    ): Promise<QueryResult<BaseItemDto>> {
        if (options && options.SeriesId) {
            if (typeof options.SeriesId !== "string") {
                throw new Error("SeriesId has to be a string");
            }
            if (isLocalId(options.SeriesId)) {
                return createEmptyList();
            }
        }

        return super.getNextUpEpisodes(options);
    }

    public getSeasons(
        itemId: string,
        options?: GetSeasons
    ): Promise<QueryResult<BaseItemDto>> {
        if (isLocalId(itemId)) {
            const itemOptions: BaseItemsRequest = {
                ...options,
                SeriesId: itemId,
                IncludeItemTypes: "Season"
            };

            return this.getItems(this.requireUserId(), itemOptions);
        }

        return super.getSeasons(itemId, options);
    }

    public getEpisodes(
        itemId: string,
        options: GetEpisodes
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("itemId", itemId);
        assertNotNullish("options", options);

        const itemRequestOptions: BaseItemsRequest = {
            ...options,
            SeriesId: itemId,
            IncludeItemTypes: "Episode"
        };

        if (isLocalId(options.SeasonId)) {
            return this.getItems(options.UserId, itemRequestOptions);
        }

        // get episodes by recursion
        if (isLocalId(itemId)) {
            itemRequestOptions.Recursive = true;
            return this.getItems(options.UserId, itemRequestOptions);
        }

        return super.getEpisodes(itemId, options);
    }

    public async getLatestOfflineItems(options: BaseItemsRequest = {}) {
        options.SortBy = "DateCreated";
        options.SortOrder = "Descending";

        const serverInfo = this.serverInfo;

        if (serverInfo) {
            const items = await this.localAssetManager.getViewItems(
                serverInfo.Id!,
                null,
                options
            );
            items.forEach(item => {
                adjustGuidProperties(item);
            });
            return items;
        }

        return [];
    }

    public async getThemeMedia(
        userId: Optional<string>,
        itemId: string,
        inherit?: boolean
    ): Promise<AllThemeMediaResult> {
        assertNotNullish("itemId", itemId);

        if (
            isLocalViewId(itemId) ||
            isLocalId(itemId) ||
            isTopLevelLocalViewId(itemId)
        ) {
            throw new Error();
        }

        return super.getThemeMedia(userId, itemId, inherit);
    }

    public async getSpecialFeatures(
        userId: string,
        itemId: string
    ): Promise<BaseItemDto[]> {
        assertNotNullish("userId", userId);
        assertNotNullish("itemId", itemId);

        if (isLocalId(itemId)) {
            return [];
        }

        return super.getSpecialFeatures(userId, itemId);
    }

    public async getSimilarItems(
        itemId: string,
        options?: GetSimilarItems
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("itemId", itemId);

        if (isLocalId(itemId)) {
            return createEmptyList();
        }

        return super.getSimilarItems(itemId, options);
    }

    public async updateFavoriteStatus(
        userId: string,
        itemId: string,
        isFavorite: boolean
    ): Promise<void> {
        assertNotNullish("userId", userId);
        assertNotNullish("itemId", itemId);
        assertNotNullish("isFavorite", isFavorite);

        if (isLocalId(itemId)) {
            return;
        }

        return super.updateFavoriteStatus(userId, itemId, isFavorite);
    }

    public getScaledImageUrl(itemId: string, options: ImageRequest): string {
        assertNotNullish("itemId", itemId);
        assertNotNullish("options", options);
        assertNotNullish("options.Type", options.Type);

        if (isLocalId(itemId)) {
            const serverInfo = this.requireServerInfo;
            const id = stripLocalPrefix(itemId);

            return this.localAssetManager.getImageUrl(
                serverInfo.Id!,
                id,
                options
            );
        }

        return super.getScaledImageUrl(itemId, options);
    }

    public async reportPlaybackStart(
        options: PlaybackStartInfo
    ): Promise<void> {
        assertNotNullish("options", options);

        if (isLocalId(options.ItemId)) {
            return;
        }

        return super.reportPlaybackStart(options);
    }

    public async reportPlaybackProgress(
        options: PlaybackProgressInfo
    ): Promise<void> {
        assertNotNullish("options", options);

        if (isLocalId(options.ItemId)) {
            const serverInfo = this.serverInfo;

            if (serverInfo) {
                const item = await this.localAssetManager.getLocalItem(
                    serverInfo.Id!,
                    stripLocalPrefix(options.ItemId)
                );
                const libraryItem = item.Item!;

                if (
                    libraryItem.MediaType === MediaType.Video ||
                    libraryItem.Type === "AudioBook"
                ) {
                    libraryItem.UserData = {
                        Rating: null,
                        UnplayedItemCount: null,
                        PlayCount: 0,
                        IsFavorite: false,
                        Likes: null,
                        LastPlayedDate: null,
                        Played: false,
                        Key: null,
                        ItemId: libraryItem.Id,
                        ...libraryItem.UserData,
                        PlaybackPositionTicks: options.PositionTicks || 0,
                        PlayedPercentage: Math.min(
                            libraryItem.RunTimeTicks
                                ? 100 *
                                      ((options.PositionTicks || 0) /
                                          libraryItem.RunTimeTicks)
                                : 0,
                            100
                        )
                    };
                    await this.localAssetManager.addOrUpdateLocalItem(item);
                }
            }

            return;
        }

        return super.reportPlaybackProgress(options);
    }

    public reportPlaybackStopped(options: PlaybackStopInfo): Promise<void> {
        assertNotNullish("options", options);

        if (isLocalId(options.ItemId)) {
            const serverInfo = this.requireServerInfo;

            const action: UserAction = {
                Id: null,
                Date: new Date().getTime(),
                ItemId: stripLocalPrefix(options.ItemId),
                PositionTicks: options.PositionTicks,
                ServerId: serverInfo.Id,
                Type: UserActionType.PlayedItem,
                UserId: this.requireUserId()
            };

            return this.localAssetManager.recordUserAction(action);
        }

        return super.reportPlaybackStopped(options);
    }

    public async getIntros(itemId: string): Promise<QueryResult<BaseItemDto>> {
        if (isLocalId(itemId)) {
            return createEmptyList();
        }

        return super.getIntros(itemId);
    }

    public async getInstantMixFromItem(
        itemId: string,
        options?: GetSimilarItems
    ): Promise<QueryResult<BaseItemDto>> {
        if (isLocalId(itemId)) {
            return createEmptyList();
        }

        return super.getInstantMixFromItem(itemId, options);
    }

    public async getItemDownloadUrl(itemId: string): Promise<string> {
        if (isLocalId(itemId)) {
            const serverInfo = this.requireServerInfo;

            if (serverInfo) {
                const item = await this.localAssetManager.getLocalItem(
                    serverInfo.Id!,
                    stripLocalPrefix(itemId)
                );
                return item.LocalPath!;
            }
        }

        return super.getItemDownloadUrl(itemId);
    }

    private async getLocalView(
        userId?: Optional<string>
    ): Promise<BaseItemDto> {
        const views = await this.getLocalFolders(userId);

        if (views.length === 0) {
            throw new Error("Local view not found");
        }

        return {
            Name: this.downloadsTitleText,
            ServerId: this.requireServerInfo.Id,
            Id: "localview",
            Type: "localview",
            IsFolder: true
        };
    }
}

export default ApiClientEx;
