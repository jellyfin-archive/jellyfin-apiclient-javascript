import { AppStorage } from "./appStorage";
import events from "./events";
import {
    AllThemeMediaResult,
    AuthenticationResult,
    BaseDownloadRemoteImage,
    BaseItemDto,
    BaseItemsRequest,
    BaseRemoteImageRequest,
    CollectionType,
    CompRelation,
    ContentUploadHistory,
    CountryInfo,
    CreateUserByName,
    CultureDto,
    DeviceInfo,
    DisplayPreferences,
    EndPointInfo,
    FileSystemEntryInfo,
    GeneralCommand,
    GetAncestors,
    GetChannels,
    GetCriticReviews,
    GetDefaultTimer,
    GetDirectoryContents,
    GetEpisodes,
    GetLatestMedia,
    GetMovieRecommendations,
    GetNextUpEpisodes,
    GetNotifications,
    GetPackages,
    GetPlaybackInfo,
    GetPrograms,
    GetQueryFilters,
    GetRecommendedPrograms,
    GetRecordingGroups,
    GetRecordings,
    GetRecordingSeries,
    GetScheduledTasks,
    GetSearchHints,
    GetSeasons,
    GetSeriesTimers,
    GetSimilarItems,
    GetTimers,
    GetUpcomingEpisodes,
    GetUsers,
    GetUserViews,
    GuideInfo,
    HasMediaId,
    ImageInfo,
    ImageProviderInfo,
    ImageRequest,
    ImageType,
    InstallPackage,
    ItemCounts,
    ItemFilter,
    ItemSortBy,
    JsonRequestOptions,
    LibraryOptions,
    LiveTvInfo,
    LocationType,
    MediaPathInfo,
    NotificationResult,
    NotificationsSummary,
    Optional,
    PackageInfo,
    PackageType,
    PackageVersionClass,
    ParentalRating,
    PlaybackInfoResponse,
    PlaybackProgressInfo,
    PlaybackStartInfo,
    PlaybackStopInfo,
    PlaystateRequest,
    PluginInfo,
    PluginSecurityInfo,
    PostFullCapabilities,
    PublicSystemInfo,
    QueryFilters,
    QueryResult,
    RecommendationDto,
    RefreshItem,
    RegistrationInfo,
    RemoteImageResult,
    RequestOptions,
    SearchHintResult,
    SendMessageCommand,
    SeriesTimerInfoDto,
    ServerConfiguration,
    ServerInfo,
    SessionInfo,
    SortOrder,
    SystemInfo,
    TaskInfo,
    TaskTriggerInfo,
    TextRequestOptions,
    TimerInfoDto,
    UpdateItem,
    UpdateUserEasyPassword,
    UpdateUserPassword,
    UrlOptions,
    UserConfiguration,
    UserDto,
    UserItemDataDto,
    UserPolicy,
    VirtualFolderInfo,
    WebSocketMessage
} from "./types";
import { assertNotNullish, getDateParamValue } from "./utils";

function replaceAll(
    originalString: string,
    strReplace: string,
    strWith: string
) {
    const reg = new RegExp(strReplace, "ig");
    return originalString.replace(reg, strWith);
}

function onFetchFail(
    instance: ApiClient,
    url: string,
    response: Partial<Response>
) {
    events.trigger(instance, "requestfail", [
        {
            url,
            status: response.status,
            errorCode: response.headers
                ? response.headers.get("X-Application-Error-Code")
                : null
        }
    ]);
}

function paramsToString(params: object) {
    const values = [];

    for (const [key, value] of Object.entries(params)) {
        if (value !== null && value !== undefined && value !== "") {
            values.push(
                `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
            );
        }
    }
    return values.join("&");
}

function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number
): Promise<Response> {
    return new Promise(async (resolve, reject) => {
        const timeout = setTimeout(reject, timeoutMs);
        options.credentials = "same-origin";
        try {
            const response = await fetch(url, options);
            resolve(response);
        } catch (e) {
            reject(e);
        } finally {
            clearTimeout(timeout);
        }
    });
}

function getFetchPromise(request: RequestOptions): Promise<Response> {
    const headers = request.headers || {};

    if (request.dataType === "json") {
        headers.accept = "application/json";
    }

    const fetchRequest: RequestInit = {
        headers,
        method: request.type,
        credentials: "same-origin"
    };

    let contentType = request.contentType;

    if (request.data) {
        if (typeof request.data === "string") {
            fetchRequest.body = request.data;
        } else {
            fetchRequest.body = paramsToString(request.data);

            contentType =
                contentType ||
                "application/x-www-form-urlencoded; charset=UTF-8";
        }
    }

    if (contentType) {
        headers["Content-Type"] = contentType;
    }

    if (!request.timeout) {
        return fetch(request.url, fetchRequest);
    }

    return fetchWithTimeout(request.url, fetchRequest, request.timeout);
}

/**
 * Creates a new api client instance
 * @param {String} serverAddress
 * @param {String} appName
 * @param {String} appVersion
 */
export class ApiClient {
    public get requireServerInfo(): ServerInfo {
        if (!this.serverInfo) {
            throw Error("Server info was unexpectedly undefined");
        }

        return this.serverInfo;
    }
    public appStorage: AppStorage;
    public enableAutomaticBitrateDetection: Optional<boolean>;
    public manualAddressOnly: boolean = false;
    public onAuthenticated?: (
        instance: ApiClient,
        result: AuthenticationResult
    ) => any;
    public getMaxBandwidth?: () => number;

    public serverInfo?: ServerInfo;

    private _serverAddress: string;
    private readonly _deviceId: string;
    private _deviceName: string;
    private readonly _appName: string;
    private readonly _appVersion: string;
    private readonly _devicePixelRatio: number;
    private _currentUser: Optional<UserDto> = null;
    private _webSocket?: WebSocket;
    private enableAutomaticNetworking?: boolean;
    private lastFetch?: number;
    private lastDetectedBitrate?: number;
    private lastDetectedBitrateTime?: number;
    private _endPointInfo: Optional<EndPointInfo>;
    private _serverVersion: Optional<string>;
    private lastPlaybackProgressReport?: number;
    private lastPlaybackProgressReportTicks?: null | number;
    private messageIdsReceived: Record<string, boolean> = {};
    private detectTimeout: Optional<ReturnType<typeof setTimeout>>;

    constructor(
        appStorage: any,
        serverAddress: string,
        appName: string,
        appVersion: string,
        deviceName: string,
        deviceId: string,
        devicePixelRatio: number
    ) {
        if (!serverAddress) {
            throw new Error("Must supply a serverAddress");
        }

        console.log(`ApiClient serverAddress: ${serverAddress}`);
        console.log(`ApiClient appName: ${appName}`);
        console.log(`ApiClient appVersion: ${appVersion}`);
        console.log(`ApiClient deviceName: ${deviceName}`);
        console.log(`ApiClient deviceId: ${deviceId}`);

        this.appStorage = appStorage;
        this._serverAddress = serverAddress;
        this._deviceId = deviceId;
        this._deviceName = deviceName;
        this._appName = appName;
        this._appVersion = appVersion;
        this._devicePixelRatio = devicePixelRatio;
    }

    public appName() {
        return this._appName;
    }

    public appVersion() {
        return this._appVersion;
    }

    public deviceName() {
        return this._deviceName;
    }

    public deviceId() {
        return this._deviceId;
    }

    public setRequestHeaders(headers: Record<string, string>) {
        const appName = this._appName;
        const currentServerInfo = this.serverInfo;

        const values = [];

        if (appName) {
            values.push(`Client="${appName}"`);
        }

        if (this.deviceName) {
            values.push(`Device="${this.deviceName}"`);
        }

        if (this._deviceId) {
            values.push(`DeviceId="${this._deviceId}"`);
        }

        if (this._appVersion) {
            values.push(`Version="${this._appVersion}"`);
        }

        if (currentServerInfo && currentServerInfo.AccessToken) {
            const accessToken = currentServerInfo.AccessToken;
            values.push(`Token="${accessToken}"`);
        }

        if (values.length) {
            const auth = `MediaBrowser ${values.join(", ")}`;
            // headers.Authorization = auth;
            headers["X-Emby-Authorization"] = auth;
        }
    }

    /**
     * Gets the server address.
     */
    public serverAddress(val?: string) {
        if (val) {
            if (val.toLowerCase().indexOf("http") !== 0) {
                throw new Error(`Invalid url: ${val}`);
            }

            const changed = val !== this._serverAddress;

            this._serverAddress = val;

            this.onNetworkChange();

            if (changed) {
                events.trigger(this, "serveraddresschanged");
            }
        }

        return this._serverAddress;
    }

    public onNetworkChange() {
        this.lastDetectedBitrate = 0;
        this.lastDetectedBitrateTime = 0;
        this.setSavedEndpointInfo(null);

        this.redetectBitrate();
    }

    /**
     * Creates an api url based on a handler name and query string parameters
     */
    public getUrl(
        name: string,
        params?: object | null,
        serverAddress?: string
    ) {
        if (!name) {
            throw new Error("Url name cannot be empty");
        }

        let url = serverAddress || this._serverAddress;

        if (!url) {
            throw new Error("serverAddress is yet not set");
        }
        const lowered = url.toLowerCase();
        if (!lowered.includes("/emby") && !lowered.includes("/mediabrowser")) {
            url += "/emby";
        }

        if (name.charAt(0) !== "/") {
            url += "/";
        }

        url += name;

        if (params) {
            const paramStr = paramsToString(params);
            if (paramStr) {
                url += `?${paramStr}`;
            }
        }

        return url;
    }

    public fetchWithFailover(
        request: any,
        enableReconnection: boolean
    ): Promise<any> {
        console.log(`Requesting ${request.url}`);

        request.timeout = 30000;

        return getFetchPromise(request).then(
            response => {
                this.lastFetch = new Date().getTime();

                if (response.status < 400) {
                    if (
                        request.dataType === "json" ||
                        request.headers.accept === "application/json"
                    ) {
                        return response.json();
                    } else if (
                        request.dataType === "text" ||
                        (response.headers.get("Content-Type") || "")
                            .toLowerCase()
                            .indexOf("text/") === 0
                    ) {
                        return response.text();
                    } else {
                        return response;
                    }
                } else {
                    onFetchFail(this, request.url, response);
                    return Promise.reject(response);
                }
            },
            error => {
                if (error) {
                    console.log(
                        `Request failed to ${request.url} ${error.toString()}`
                    );
                } else {
                    console.log(`Request timed out to ${request.url}`);
                }

                // http://api.jquery.com/jQuery.ajax/
                if ((!error || !error.status) && enableReconnection) {
                    console.log("Attempting reconnection");

                    const previousServerAddress = this.serverAddress();

                    return this.tryReconnect().then(
                        () => {
                            console.log("Reconnect succeesed");
                            request.url = request.url.replace(
                                previousServerAddress,
                                this.serverAddress()
                            );

                            return this.fetchWithFailover(request, false);
                        },
                        innerError => {
                            console.log("Reconnect failed");
                            onFetchFail(this, request.url, {});
                            throw innerError;
                        }
                    );
                } else {
                    console.log("Reporting request failure");

                    onFetchFail(this, request.url, {});
                    throw error;
                }
            }
        );
    }

    /**
     * Wraps around jQuery ajax methods to add additional info to the request.
     */
    public fetch<T>(
        request: JsonRequestOptions,
        includeAuthorization?: boolean
    ): Promise<T>;
    public fetch(
        request: TextRequestOptions,
        includeAuthorization?: boolean
    ): Promise<string>;
    public fetch(
        request: RequestOptions,
        includeAuthorization?: boolean
    ): Promise<Response | string>;
    public fetch<T = any>(
        request: RequestOptions,
        includeAuthorization?: boolean
    ): Promise<T> {
        assertNotNullish("request", request);

        request.headers = request.headers || {};

        if (includeAuthorization !== false) {
            this.setRequestHeaders(request.headers);
        }

        if (
            this.enableAutomaticNetworking === false ||
            request.type !== "GET"
        ) {
            console.log(
                `Requesting url without automatic networking: ${request.url}`
            );

            const instance = this;
            return getFetchPromise(request).then(
                response => {
                    instance.lastFetch = new Date().getTime();

                    if (response.status < 400) {
                        if (
                            request.dataType === "json" ||
                            request.headers?.accept === "application/json"
                        ) {
                            return response.json();
                        } else if (
                            request.dataType === "text" ||
                            (response.headers.get("Content-Type") || "")
                                .toLowerCase()
                                .indexOf("text/") === 0
                        ) {
                            return response.text();
                        } else {
                            return response;
                        }
                    } else {
                        onFetchFail(instance, request.url, response);
                        return Promise.reject(response);
                    }
                },
                error => {
                    onFetchFail(instance, request.url, {});
                    throw error;
                }
            );
        }

        return this.fetchWithFailover(request, true);
    }

    public setAuthenticationInfo(accessKey?: string, userId?: string) {
        this._currentUser = null;

        this.requireServerInfo.AccessToken = accessKey;
        this.requireServerInfo.UserId = userId;
        this.redetectBitrate();
    }

    /**
     * Gets or sets the current user id.
     */
    public getCurrentUserId() {
        return this.serverInfo?.UserId;
    }

    public requireUserId(): string {
        const uid = this.serverInfo?.UserId;
        assertNotNullish("userId", uid);
        return uid!!;
    }

    public accessToken() {
        return this.serverInfo?.AccessToken;
    }

    public serverId() {
        return this.serverInfo?.Id;
    }

    public serverName() {
        return this.serverInfo?.Name;
    }

    /**
     * Gets or sets the current user.
     */
    public getCurrentUser(enableCache?: boolean): Promise<UserDto> {
        if (this._currentUser) {
            return Promise.resolve(this._currentUser);
        }

        const userId = this.getCurrentUserId();

        if (!userId) {
            return Promise.reject();
        }

        let user;

        const serverPromise = this.getUser(userId).then(
            userResp => {
                this.appStorage.setItem(
                    `user-${userResp.Id}-${userResp.ServerId}`,
                    JSON.stringify(userResp)
                );

                this._currentUser = userResp;
                return userResp;
            },
            response => {
                // if timed out, look for cached value
                if (!response.status) {
                    if (userId && this.accessToken()) {
                        user = this.getCachedUser(userId);
                        if (user) {
                            return Promise.resolve(user);
                        }
                    }
                }

                throw response;
            }
        );

        if (!this.lastFetch && enableCache !== false) {
            user = this.getCachedUser(userId);
            if (user) {
                return Promise.resolve(user);
            }
        }

        return serverPromise;
    }

    public isLoggedIn() {
        const info = this.requireServerInfo;
        if (info) {
            if (info.UserId && info.AccessToken) {
                return true;
            }
        }

        return false;
    }

    /**
     * Logout current user
     */
    public logout() {
        this.stopBitrateDetection();
        this.closeWebSocket();

        const done = () => {
            const info = this.requireServerInfo;
            if (info && info.UserId && info.Id) {
                this.appStorage.removeItem(`user-${info.UserId}-${info.Id}`);
            }
            this.setAuthenticationInfo();
        };

        if (this.accessToken()) {
            const url = this.getUrl("Sessions/Logout");

            return this.fetch({
                type: "POST",
                url
            }).then(done, done);
        }

        done();
        return Promise.resolve();
    }

    /**
     * Authenticates a user
     */
    public authenticateUserByName(
        name: string,
        password?: string
    ): Promise<AuthenticationResult> {
        assertNotNullish("name", name);

        const url = this.getUrl("Users/authenticatebyname");

        return new Promise((resolve, reject) => {
            const postData = {
                Username: name,
                Pw: password || ""
            };

            this.fetch<AuthenticationResult>({
                type: "POST",
                url,
                data: JSON.stringify(postData),
                dataType: "json",
                contentType: "application/json"
            }).then(result => {
                const afterOnAuthenticated = () => {
                    this.redetectBitrate();
                    resolve(result);
                };

                if (this.onAuthenticated) {
                    this.onAuthenticated(this, result).then(
                        afterOnAuthenticated
                    );
                } else {
                    afterOnAuthenticated();
                }
            }, reject);
        });
    }

    public ensureWebSocket() {
        if (
            this.isWebSocketOpenOrConnecting() ||
            !this.isWebSocketSupported()
        ) {
            return;
        }

        try {
            this.openWebSocket();
        } catch (err) {
            console.log(`Error opening web socket: ${err}`);
        }
    }

    public openWebSocket() {
        const accessToken = this.accessToken();

        if (!accessToken) {
            throw new Error("Cannot open web socket without access token.");
        }

        let url = this.getUrl("socket");

        url = replaceAll(url, "emby/socket", "embywebsocket");
        url = replaceAll(url, "https:", "wss:");
        url = replaceAll(url, "http:", "ws:");

        url += `?api_key=${accessToken}`;
        url += `&deviceId=${this.deviceId()}`;

        console.log(`opening web socket with url: ${url}`);

        const webSocket = new WebSocket(url);

        webSocket.onmessage = this.onWebSocketMessageListener();
        webSocket.onopen = this.onWebSocketOpenListener();
        webSocket.onerror = this.onWebSocketErrorListener();
        this.setSocketOnClose(webSocket);

        this._webSocket = webSocket;
    }

    public closeWebSocket() {
        const socket = this._webSocket;

        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.close();
        }
    }

    public sendWebSocketMessage(name: string, data: any) {
        console.log(`Sending web socket message: ${name}`);

        const msg: Partial<WebSocketMessage> = { MessageType: name };

        if (data) {
            msg.Data = data;
        }

        const str = JSON.stringify(msg);

        this._webSocket!.send(str);
    }

    public sendMessage(name: string, data: any) {
        if (this.isWebSocketOpen()) {
            this.sendWebSocketMessage(name, data);
        }
    }

    public isMessageChannelOpen() {
        return this.isWebSocketOpen();
    }

    public isWebSocketOpen() {
        const socket = this._webSocket;

        if (socket) {
            return socket.readyState === WebSocket.OPEN;
        }

        return false;
    }

    public isWebSocketOpenOrConnecting() {
        const socket = this._webSocket;

        if (socket) {
            return (
                socket.readyState === WebSocket.OPEN ||
                socket.readyState === WebSocket.CONNECTING
            );
        }

        return false;
    }

    public get(url: string) {
        return this.fetch({
            type: "GET",
            url
        });
    }

    public getJSON<T = any>(url: string, includeAuthorization?: boolean) {
        return this.fetch<T>(
            {
                url,
                type: "GET",
                dataType: "json",
                headers: {
                    accept: "application/json"
                }
            },
            includeAuthorization
        );
    }

    public updateServerInfo(server: ServerInfo, serverUrl?: string): void {
        assertNotNullish("server", server);

        this.serverInfo = server;

        if (!serverUrl) {
            throw new Error(
                `serverUrl cannot be null. serverInfo: ${JSON.stringify(
                    server
                )}`
            );
        }
        console.log(`Setting server address to ${serverUrl}`);
        this.serverAddress(serverUrl);
    }

    public isWebSocketSupported() {
        try {
            return WebSocket != null;
        } catch (err) {
            return false;
        }
    }

    public clearAuthenticationInfo() {
        this.setAuthenticationInfo();
    }

    public encodeName(name: string) {
        name = name.split("/").join("-");
        name = name.split("&").join("-");
        name = name.split("?").join("-");

        const val = paramsToString({ name });
        return val.substring(val.indexOf("=") + 1).replace("'", "%27");
    }

    public async getDownloadSpeed(byteSize: number): Promise<number> {
        const url = this.getUrl("Playback/BitrateTest", {
            Size: byteSize.toString()
        });

        const now = new Date().getTime();

        await this.fetch({
            type: "GET",
            url,
            timeout: 5000
        });

        const responseTimeSeconds = (new Date().getTime() - now) / 1000;
        const bytesPerSecond = byteSize / responseTimeSeconds;
        return Math.round(bytesPerSecond * 8);
    }

    public async detectBitrate(force: boolean = false) {
        if (
            !force &&
            this.lastDetectedBitrate &&
            new Date().getTime() - (this.lastDetectedBitrateTime || 0) <=
                3600000
        ) {
            return Promise.resolve(this.lastDetectedBitrate);
        }

        try {
            const info = await this.getEndpointInfo();
            return await this.detectBitrateWithEndpointInfo(info);
        } catch (err) {
            return await this.detectBitrateWithEndpointInfo({});
        }
    }

    /**
     * Gets an item from the server
     * Omit itemId to get the root folder.
     */
    public getItem(
        userId: Optional<string>,
        itemId: string
    ): Promise<BaseItemDto> {
        assertNotNullish("itemId", itemId);

        const url = userId
            ? this.getUrl(`Users/${userId}/Items/${itemId}`)
            : this.getUrl(`Items/${itemId}`);

        return this.getJSON(url);
    }

    /**
     * Gets the root folder from the server
     */
    public getRootFolder(userId: string): Promise<BaseItemDto> {
        assertNotNullish("userId", userId);

        const url = this.getUrl(`Users/${userId}/Items/Root`);

        return this.getJSON(url);
    }

    public getNotificationSummary(
        userId: string
    ): Promise<NotificationsSummary> {
        assertNotNullish("userId", userId);

        const url = this.getUrl(`Notifications/${userId}/Summary`);

        return this.getJSON(url);
    }

    public getNotifications(
        userId: string,
        options?: GetNotifications
    ): Promise<NotificationResult> {
        assertNotNullish("userId", userId);

        const url = this.getUrl(`Notifications/${userId}`, options || {});

        return this.getJSON(url);
    }

    public async markNotificationsRead(
        userId: string,
        idList: string[],
        isRead?: boolean
    ): Promise<void> {
        assertNotNullish("userId", userId);
        assertNotNullish("idList", idList);

        const suffix = isRead ? "Read" : "Unread";

        const params = {
            UserId: userId,
            Ids: idList.join(",")
        };

        const url = this.getUrl(`Notifications/${userId}/${suffix}`, params);

        await this.fetch({
            type: "POST",
            url
        });
    }

    public getRemoteImageProviders(
        options: HasMediaId
    ): Promise<ImageProviderInfo[]> {
        assertNotNullish("options", options);

        const urlPrefix = this.getRemoteImagePrefix(options);

        const url = this.getUrl(`${urlPrefix}/RemoteImages/Providers`);

        return this.getJSON(url);
    }

    public getAvailableRemoteImages(
        options: BaseRemoteImageRequest & HasMediaId
    ): Promise<RemoteImageResult> {
        assertNotNullish("options", options);

        const urlPrefix = this.getRemoteImagePrefix(options);

        const url = this.getUrl(`${urlPrefix}/RemoteImages`, options);

        return this.getJSON(url);
    }

    public async downloadRemoteImage(
        options: BaseDownloadRemoteImage & HasMediaId
    ): Promise<void> {
        assertNotNullish("options", options);

        const urlPrefix = this.getRemoteImagePrefix(options);

        const url = this.getUrl(`${urlPrefix}/RemoteImages/Download`, options);

        await this.fetch({
            type: "POST",
            url
        });
    }

    public getRecordingFolders(
        userId: string
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("userId", userId);

        const url = this.getUrl("LiveTv/Recordings/Folders", { userId });

        return this.getJSON(url);
    }

    public getLiveTvInfo(): Promise<LiveTvInfo> {
        const url = this.getUrl("LiveTv/Info");

        return this.getJSON(url);
    }

    public getLiveTvGuideInfo(): Promise<GuideInfo> {
        const url = this.getUrl("LiveTv/GuideInfo");

        return this.getJSON(url);
    }

    public getLiveTvChannel(id: string, userId?: string): Promise<BaseItemDto> {
        assertNotNullish("id", id);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl(`LiveTv/Channels/${id}`, options);

        return this.getJSON(url);
    }

    public getLiveTvChannels(
        options: GetChannels = {}
    ): Promise<QueryResult<BaseItemDto>> {
        const url = this.getUrl("LiveTv/Channels", options);

        return this.getJSON(url);
    }

    public getLiveTvPrograms(
        options: GetPrograms = {}
    ): Promise<QueryResult<BaseItemDto>> {
        if (
            options.ChannelIds &&
            (options.ChannelIds as string).length > 1800
        ) {
            return this.fetch({
                type: "POST",
                url: this.getUrl("LiveTv/Programs"),
                data: JSON.stringify(options),
                contentType: "application/json",
                dataType: "json"
            });
        }

        return this.fetch({
            type: "GET",
            url: this.getUrl("LiveTv/Programs", options),
            dataType: "json"
        });
    }

    public getLiveTvRecommendedPrograms(
        options: GetRecommendedPrograms = {}
    ): Promise<QueryResult<BaseItemDto>> {
        return this.fetch({
            type: "GET",
            url: this.getUrl("LiveTv/Programs/Recommended", options),
            dataType: "json"
        });
    }

    public getLiveTvRecordings(
        options: GetRecordings = {}
    ): Promise<QueryResult<BaseItemDto>> {
        const url = this.getUrl("LiveTv/Recordings", options);

        return this.getJSON(url);
    }

    public getLiveTvRecordingSeries(
        options: GetRecordingSeries = {}
    ): Promise<QueryResult<BaseItemDto>> {
        const url = this.getUrl("LiveTv/Recordings/Series", options);

        return this.getJSON(url);
    }

    public getLiveTvRecordingGroups(
        options: GetRecordingGroups = {}
    ): Promise<QueryResult<BaseItemDto>> {
        const url = this.getUrl("LiveTv/Recordings/Groups", options);

        return this.getJSON(url);
    }

    public getLiveTvRecordingGroup(id: string): Promise<BaseItemDto> {
        assertNotNullish("id", id);

        const url = this.getUrl(`LiveTv/Recordings/Groups/${id}`);

        return this.getJSON(url);
    }

    public getLiveTvRecording(
        id: string,
        userId?: string
    ): Promise<BaseItemDto> {
        assertNotNullish("id", id);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl(`LiveTv/Recordings/${id}`, options);

        return this.getJSON(url);
    }

    public getLiveTvProgram(id: string, userId?: string): Promise<BaseItemDto> {
        assertNotNullish("id", id);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl(`LiveTv/Programs/${id}`, options);

        return this.getJSON(url);
    }

    public async deleteLiveTvRecording(id: string): Promise<void> {
        assertNotNullish("id", id);

        const url = this.getUrl(`LiveTv/Recordings/${id}`);

        await this.fetch({
            type: "DELETE",
            url
        });
    }

    public async cancelLiveTvTimer(id: string): Promise<void> {
        assertNotNullish("id", id);

        const url = this.getUrl(`LiveTv/Timers/${id}`);

        await this.fetch({
            type: "DELETE",
            url
        });
    }

    public getLiveTvTimers(
        options: GetTimers = {}
    ): Promise<QueryResult<TimerInfoDto>> {
        const url = this.getUrl("LiveTv/Timers", options);

        return this.getJSON(url);
    }

    public getLiveTvTimer(id: string): Promise<TimerInfoDto> {
        assertNotNullish("id", id);

        const url = this.getUrl(`LiveTv/Timers/${id}`);

        return this.getJSON(url);
    }

    public getNewLiveTvTimerDefaults(
        options: GetDefaultTimer = {}
    ): Promise<SeriesTimerInfoDto> {
        const url = this.getUrl("LiveTv/Timers/Defaults", options);

        return this.getJSON(url);
    }

    public async createLiveTvTimer(item: TimerInfoDto): Promise<void> {
        assertNotNullish("item", item);

        const url = this.getUrl("LiveTv/Timers");

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(item),
            contentType: "application/json"
        });
    }

    public async updateLiveTvTimer(item: TimerInfoDto): Promise<void> {
        assertNotNullish("item", item);

        const url = this.getUrl(`LiveTv/Timers/${item.Id}`);

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(item),
            contentType: "application/json"
        });
    }

    public async resetLiveTvTuner(id: string): Promise<void> {
        assertNotNullish("id", id);

        const url = this.getUrl(`LiveTv/Tuners/${id}/Reset`);

        await this.fetch({
            type: "POST",
            url
        });
    }

    public getLiveTvSeriesTimers(
        options: GetSeriesTimers = {}
    ): Promise<QueryResult<SeriesTimerInfoDto>> {
        const url = this.getUrl("LiveTv/SeriesTimers", options);

        return this.getJSON(url);
    }

    public getLiveTvSeriesTimer(id: string): Promise<SeriesTimerInfoDto> {
        assertNotNullish("id", id);

        const url = this.getUrl(`LiveTv/SeriesTimers/${id}`);

        return this.getJSON(url);
    }

    public async cancelLiveTvSeriesTimer(id: string): Promise<void> {
        assertNotNullish("id", id);

        const url = this.getUrl(`LiveTv/SeriesTimers/${id}`);

        await this.fetch({
            type: "DELETE",
            url
        });
    }

    public async createLiveTvSeriesTimer(
        item: Partial<SeriesTimerInfoDto>
    ): Promise<void> {
        assertNotNullish("item", item);

        const url = this.getUrl("LiveTv/SeriesTimers");

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(item),
            contentType: "application/json"
        });
    }

    public async updateLiveTvSeriesTimer(
        item: Partial<SeriesTimerInfoDto>
    ): Promise<void> {
        assertNotNullish("item", item);

        const url = this.getUrl(`LiveTv/SeriesTimers/${item.Id}`);

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(item),
            contentType: "application/json"
        });
    }

    public getRegistrationInfo(feature: string): Promise<RegistrationInfo> {
        assertNotNullish("feature", feature);

        const url = this.getUrl(`Registrations/${feature}`);

        return this.getJSON(url);
    }

    /**
     * Gets the current server status
     */
    public async getSystemInfo(itemId: string): Promise<SystemInfo> {
        assertNotNullish("itemId", itemId);

        const url = this.getUrl("System/Info");

        const info = await this.getJSON(url);
        this.setSystemInfo(info);
        return info;
    }

    /**
     * Gets the current server status
     */
    public async getPublicSystemInfo(): Promise<PublicSystemInfo> {
        const url = this.getUrl("System/Info/Public");

        const info = await this.getJSON(url);
        this.setSystemInfo(info);
        return info;
    }

    public getInstantMixFromItem(
        itemId: string,
        options?: GetSimilarItems
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("itemId", itemId);

        const url = this.getUrl(`Items/${itemId}/InstantMix`, options);

        return this.getJSON(url);
    }

    public getEpisodes(
        itemId: string,
        options: GetEpisodes
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("itemId", itemId);
        assertNotNullish("options", options);

        const url = this.getUrl(`Shows/${itemId}/Episodes`, options);

        return this.getJSON(url);
    }

    public getDisplayPreferences(
        id: string,
        userId: string,
        client: string
    ): Promise<DisplayPreferences> {
        assertNotNullish("id", id);
        assertNotNullish("userId", userId);
        assertNotNullish("client", client);

        const url = this.getUrl(`DisplayPreferences/${id}`, {
            userId,
            client
        });

        return this.getJSON(url);
    }

    public async updateDisplayPreferences(
        id: string,
        prefs: DisplayPreferences,
        userId: string,
        client: string
    ): Promise<void> {
        assertNotNullish("id", id);
        assertNotNullish("prefs", prefs);
        assertNotNullish("userId", userId);
        assertNotNullish("app", client);

        const url = this.getUrl(`DisplayPreferences/${id}`, {
            userId,
            client
        });

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(prefs),
            contentType: "application/json"
        });
    }

    public getSeasons(
        itemId: string,
        options?: GetSeasons
    ): Promise<QueryResult<BaseItemDto>> {
        const url = this.getUrl(`Shows/${itemId}/Seasons`, options);

        return this.getJSON(url);
    }

    public getSimilarItems(
        itemId: string,
        options?: GetSimilarItems
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("itemId", itemId);

        const url = this.getUrl(`Items/${itemId}/Similar`, options);

        return this.getJSON(url);
    }

    /**
     * Gets all cultures known to the server
     */
    public getCultures(): Promise<CultureDto[]> {
        const url = this.getUrl("Localization/cultures");

        return this.getJSON(url);
    }

    /**
     * Gets all countries known to the server
     */
    public getCountries(): Promise<CountryInfo[]> {
        const url = this.getUrl("Localization/countries");

        return this.getJSON(url);
    }

    public getPlaybackInfo(
        itemId: string,
        options: GetPlaybackInfo = {}
    ): Promise<PlaybackInfoResponse> {
        assertNotNullish("itemId", itemId);

        return this.fetch({
            url: this.getUrl(`Items/${itemId}/PlaybackInfo`, options),
            type: "POST",
            data: options,
            contentType: "application/json",
            dataType: "json"
        });
    }

    public getIntros(itemId: string): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("itemId", itemId);

        return this.getJSON(
            this.getUrl(
                `Users/${this.getCurrentUserId()}/Items/${itemId}/Intros`
            )
        );
    }

    /**
     * Gets the directory contents of a path on the server
     */
    public getDirectoryContents(
        path: string,
        options: Partial<GetDirectoryContents> = {}
    ): Promise<FileSystemEntryInfo[]> {
        assertNotNullish("path", path);

        options.Path = path;

        const url = this.getUrl("Environment/DirectoryContents", options);

        return this.getJSON(url);
    }

    /**
     * Gets shares from a network device
     */
    public getNetworkShares(path: string): Promise<FileSystemEntryInfo[]> {
        assertNotNullish("path", path);

        const url = this.getUrl("Environment/NetworkShares", { path });

        return this.getJSON(url);
    }

    /**
     * Gets the parent of a given path
     */
    public getParentPath(path: string): Promise<string> {
        assertNotNullish("path", path);

        const url = this.getUrl("Environment/ParentPath", { path });

        return this.fetch({
            type: "GET",
            url,
            dataType: "text"
        });
    }

    /**
     * Gets a list of physical drives from the server
     */
    public getDrives(): Promise<FileSystemEntryInfo[]> {
        const url = this.getUrl("Environment/Drives");

        return this.getJSON(url);
    }

    /**
     * Gets a list of network devices from the server
     */
    public getNetworkDevices(): Promise<FileSystemEntryInfo[]> {
        const url = this.getUrl("Environment/NetworkDevices");

        return this.getJSON(url);
    }

    /**
     * Cancels a package installation
     */
    public async cancelPackageInstallation(
        installationId: string
    ): Promise<void> {
        assertNotNullish("installationId", installationId);

        const url = this.getUrl(`Packages/Installing/${installationId}`);

        await this.fetch({
            type: "DELETE",
            url
        });
    }

    /**
     * Refreshes metadata for an item
     */
    public async refreshItem(
        itemId: string,
        options?: RefreshItem
    ): Promise<void> {
        const url = this.getUrl(`Items/${itemId}/Refresh`, options || {});

        await this.fetch({
            type: "POST",
            url
        });
    }

    /**
     * Installs or updates a new plugin
     */
    public async installPlugin(
        name: string,
        guid?: string,
        updateClass?: PackageVersionClass,
        version?: string
    ): Promise<void> {
        assertNotNullish("name", name);

        const options: InstallPackage = {
            UpdateClass: updateClass,
            AssemblyGuid: guid
        };

        if (version) {
            options.Version = version;
        }

        const url = this.getUrl(`Packages/Installed/${name}`, options);

        await this.fetch({
            type: "POST",
            url
        });
    }

    /**
     * Instructs the server to perform a restart.
     */
    public async restartServer(): Promise<void> {
        const url = this.getUrl("System/Restart");

        await this.fetch({
            type: "POST",
            url
        });
    }

    /**
     * Instructs the server to perform a shutdown.
     */
    public async shutdownServer(): Promise<void> {
        const url = this.getUrl("System/Shutdown");

        await this.fetch({
            type: "POST",
            url
        });
    }

    /**
     * Gets information about an installable package
     */
    public getPackageInfo(name: string, guid?: string): Promise<PackageInfo> {
        assertNotNullish("name", name);

        const options = {
            AssemblyGuid: guid
        };

        const url = this.getUrl(`Packages/${name}`, options);

        return this.getJSON(url);
    }

    /**
     * Gets the virtual folder list
     */
    public getVirtualFolders(): Promise<VirtualFolderInfo[]> {
        const url = this.getUrl("Library/VirtualFolders");

        return this.getJSON(url);
    }

    /**
     * Gets all the paths of the locations in the physical root.
     */
    public getPhysicalPaths(): Promise<string[]> {
        const url = this.getUrl("Library/PhysicalPaths");

        return this.getJSON(url);
    }

    /**
     * Gets the current server configuration
     */
    public getServerConfiguration(): Promise<ServerConfiguration> {
        const url = this.getUrl("System/Configuration");

        return this.getJSON(url);
    }

    public getDevicesOptions(): Promise<QueryResult<DeviceInfo>> {
        const url = this.getUrl("System/Configuration/devices");

        return this.getJSON(url);
    }

    public getContentUploadHistory(): Promise<ContentUploadHistory> {
        const url = this.getUrl("Devices/CameraUploads", {
            DeviceId: this.deviceId()
        });

        return this.getJSON(url);
    }

    public getNamedConfiguration(name: string): Promise<void> {
        assertNotNullish("name", name);

        const url = this.getUrl(`System/Configuration/${name}`);

        return this.getJSON(url);
    }

    /**
     * Gets the server's scheduled tasks
     */
    public getScheduledTasks(
        options: GetScheduledTasks = {}
    ): Promise<TaskInfo[]> {
        const url = this.getUrl("ScheduledTasks", options);

        return this.getJSON(url);
    }

    /**
     * Starts a scheduled task
     */
    public async startScheduledTask(id: string): Promise<void> {
        assertNotNullish("id", id);

        const url = this.getUrl(`ScheduledTasks/Running/${id}`);

        await this.fetch({
            type: "POST",
            url
        });
    }

    /**
     * Gets a scheduled task
     */
    public getScheduledTask(id: string): Promise<TaskInfo> {
        assertNotNullish("id", id);

        const url = this.getUrl(`ScheduledTasks/${id}`);

        return this.getJSON(url);
    }

    public getNextUpEpisodes(
        options?: GetNextUpEpisodes
    ): Promise<QueryResult<BaseItemDto>> {
        const url = this.getUrl("Shows/NextUp", options);

        return this.getJSON(url);
    }

    /**
     * Stops a scheduled task
     */
    public async stopScheduledTask(id: string): Promise<void> {
        assertNotNullish("id", id);

        const url = this.getUrl(`ScheduledTasks/Running/${id}`);

        await this.fetch({
            type: "DELETE",
            url
        });
    }

    /**
     * Gets the configuration of a plugin
     */
    public getPluginConfiguration(id: string): Promise<any> {
        assertNotNullish("id", id);

        const url = this.getUrl(`Plugins/${id}/Configuration`);

        return this.getJSON(url);
    }

    /**
     * Gets a list of plugins that are available to be installed
     */
    public getAvailablePlugins(
        options: GetPackages = {}
    ): Promise<PackageInfo[]> {
        options.PackageType = PackageType.UserInstalled;

        const url = this.getUrl("Packages", options);

        return this.getJSON(url);
    }

    /**
     * Uninstalls a plugin
     */
    public async uninstallPlugin(id: string): Promise<void> {
        assertNotNullish("id", id);

        const url = this.getUrl(`Plugins/${id}`);

        await this.fetch({
            type: "DELETE",
            url
        });
    }

    /**
     * Removes a virtual folder
     */
    public async removeVirtualFolder(
        name: string,
        refreshLibrary?: boolean
    ): Promise<void> {
        assertNotNullish("name", name);

        let url = "Library/VirtualFolders";

        url = this.getUrl(url, {
            refreshLibrary: !!refreshLibrary,
            name
        });

        await this.fetch({
            type: "DELETE",
            url
        });
    }

    /**
     * Adds a virtual folder
     */
    public async addVirtualFolder(
        name: string,
        type?: CollectionType,
        refreshLibrary?: boolean,
        libraryOptions?: LibraryOptions
    ): Promise<void> {
        assertNotNullish("name", name);

        const options: UrlOptions = {};

        if (type) {
            options.collectionType = type;
        }

        options.refreshLibrary = !!refreshLibrary;
        options.name = name;

        let url = "Library/VirtualFolders";

        url = this.getUrl(url, options);

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify({
                LibraryOptions: libraryOptions
            }),
            contentType: "application/json"
        });
    }

    public async updateVirtualFolderOptions(
        id: string,
        libraryOptions: LibraryOptions
    ): Promise<void> {
        assertNotNullish("id", id);

        const url = this.getUrl("Library/VirtualFolders/LibraryOptions");

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify({
                Id: id,
                LibraryOptions: libraryOptions
            }),
            contentType: "application/json"
        });
    }

    /**
     * Renames a virtual folder
     */
    public async renameVirtualFolder(
        name: string,
        newName: string,
        refreshLibrary?: boolean
    ): Promise<void> {
        assertNotNullish("name", name);
        assertNotNullish("newName", newName);

        let url = "Library/VirtualFolders/Name";

        url = this.getUrl(url, {
            refreshLibrary: !!refreshLibrary,
            newName,
            name
        });

        await this.fetch({
            type: "POST",
            url
        });
    }

    /**
     * Adds an additional mediaPath to an existing virtual folder
     */
    public async addMediaPath(
        virtualFolderName: string,
        mediaPath: string,
        networkSharePath?: string,
        refreshLibrary?: boolean
    ): Promise<void> {
        assertNotNullish("virtualFolderName", virtualFolderName);
        assertNotNullish("mediaPath", mediaPath);

        let url = "Library/VirtualFolders/Paths";

        const pathInfo: MediaPathInfo = {
            Path: mediaPath,
            NetworkPath: null
        };
        if (networkSharePath) {
            pathInfo.NetworkPath = networkSharePath;
        }

        url = this.getUrl(url, {
            refreshLibrary: !!refreshLibrary
        });

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify({
                Name: virtualFolderName,
                PathInfo: pathInfo
            }),
            contentType: "application/json"
        });
    }

    public async updateMediaPath(
        virtualFolderName: string,
        pathInfo: MediaPathInfo
    ): Promise<void> {
        assertNotNullish("virtualFolderName", virtualFolderName);
        assertNotNullish("pathInfo", pathInfo);

        let url = "Library/VirtualFolders/Paths/Update";

        url = this.getUrl(url);

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify({
                Name: virtualFolderName,
                PathInfo: pathInfo
            }),
            contentType: "application/json"
        });
    }

    /**
     * Removes a media path from a virtual folder
     */
    public async removeMediaPath(
        virtualFolderName: string,
        mediaPath: string,
        refreshLibrary?: boolean
    ): Promise<void> {
        assertNotNullish("virtualFolderName", virtualFolderName);
        assertNotNullish("mediaPath", mediaPath);

        let url = "Library/VirtualFolders/Paths";

        url = this.getUrl(url, {
            refreshLibrary: !!refreshLibrary,
            path: mediaPath,
            name: virtualFolderName
        });

        await this.fetch({
            type: "DELETE",
            url
        });
    }

    /**
     * Deletes a user
     */
    public async deleteUser(id: string): Promise<void> {
        assertNotNullish("id", id);

        const url = this.getUrl(`Users/${id}`);

        await this.fetch({
            type: "DELETE",
            url
        });
    }

    /**
     * Deletes a user image
     */
    public async deleteUserImage(
        userId: string,
        imageType: ImageType,
        imageIndex?: number
    ): Promise<void> {
        assertNotNullish("userId", userId);
        assertNotNullish("imageType", imageType);

        let url = this.getUrl(`Users/${userId}/Images/${imageType}`);

        if (imageIndex) {
            url += `/${imageIndex}`;
        }

        await this.fetch({
            type: "DELETE",
            url
        });
    }

    public async deleteItemImage(
        itemId: string,
        imageType: ImageType,
        imageIndex?: string
    ): Promise<void> {
        assertNotNullish("itemId", itemId);
        assertNotNullish("imageType", imageType);
        assertNotNullish("imageIndex", imageIndex);

        let url = this.getUrl(`Items/${itemId}/Images/${imageType}`);

        if (imageIndex) {
            url += `/${imageIndex}`;
        }

        await this.fetch({
            type: "DELETE",
            url
        });
    }

    public async deleteItem(itemId: string): Promise<void> {
        assertNotNullish("itemId", itemId);

        const url = this.getUrl(`Items/${itemId}`);

        await this.fetch({
            type: "DELETE",
            url
        });
    }

    public async stopActiveEncodings(playSessionId: string): Promise<void> {
        assertNotNullish("playSessionId", playSessionId);

        const options: UrlOptions = {
            deviceId: this.deviceId()
        };

        if (playSessionId) {
            options.PlaySessionId = playSessionId;
        }

        const url = this.getUrl("Videos/ActiveEncodings", options);

        await this.fetch({
            type: "DELETE",
            url
        });
    }

    public async reportCapabilities(
        options: PostFullCapabilities
    ): Promise<void> {
        const url = this.getUrl("Sessions/Capabilities/Full");

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(options),
            contentType: "application/json"
        });
    }

    public async updateItemImageIndex(
        itemId: string,
        imageType: ImageType,
        imageIndex: Optional<number>,
        newIndex: number
    ): Promise<void> {
        assertNotNullish("itemId", itemId);
        assertNotNullish("imageType", imageType);
        assertNotNullish("newIndex", newIndex);

        const options = { newIndex };

        const url = this.getUrl(
            `Items/${itemId}/Images/${imageType}/${imageIndex}/Index`,
            options
        );

        await this.fetch({
            type: "POST",
            url
        });
    }

    public getItemImageInfos(itemId: string): Promise<ImageInfo[]> {
        assertNotNullish("itemId", itemId);

        const url = this.getUrl(`Items/${itemId}/Images`);

        return this.getJSON(url);
    }

    public getCriticReviews(
        itemId: string,
        options?: GetCriticReviews
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("itemId", itemId);

        const url = this.getUrl(`Items/${itemId}/CriticReviews`, options);

        return this.getJSON(url);
    }

    public async getItemDownloadUrl(itemId: string): Promise<string> {
        assertNotNullish("itemId", itemId);

        const url = `Items/${itemId}/Download`;

        return this.getUrl(url, {
            api_key: this.accessToken()
        });
    }

    public getSessions(options?: UrlOptions): Promise<SessionInfo[]> {
        const url = this.getUrl("Sessions", options);

        return this.getJSON(url);
    }

    /**
     * Uploads a user image
     * @param {String} userId
     * @param {ImageType} imageType The type of image to delete, based on the server-side ImageType enum.
     * @param {Object} file The file from the input element
     */
    public uploadUserImage(
        userId: string,
        imageType: ImageType,
        file: File
    ): Promise<void> {
        assertNotNullish("userId", userId);
        assertNotNullish("imageType", imageType);
        assertNotNullish("file", file);

        if (
            file.type !== "image/png" &&
            file.type !== "image/jpeg" &&
            file.type !== "image/jpg"
        ) {
            throw new Error("File must be an image.");
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onerror = () => {
                reject();
            };

            reader.onabort = () => {
                reject();
            };

            // Closure to capture the file information.
            reader.onload = e => {
                // Split by a comma to remove the url: prefix
                const data = (e.target!.result as string).split(",")[1];

                const url = this.getUrl(`Users/${userId}/Images/${imageType}`);

                this.fetch({
                    type: "POST",
                    url,
                    data,
                    contentType: `image/${file.name.substring(
                        file.name.lastIndexOf(".") + 1
                    )}`
                }).then(() => resolve(), reject);
            };

            // Read in the image file as a data URL.
            reader.readAsDataURL(file);
        });
    }

    public uploadItemImage(
        itemId: string,
        imageType: ImageType,
        file: File
    ): Promise<void> {
        assertNotNullish("itemId", itemId);
        assertNotNullish("imageType", imageType);
        assertNotNullish("file", file);

        if (
            file.type !== "image/png" &&
            file.type !== "image/jpeg" &&
            file.type !== "image/jpg"
        ) {
            throw new Error("File must be an image.");
        }

        let url = this.getUrl(`Items/${itemId}/Images`);

        url += `/${imageType}`;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onerror = () => {
                reject();
            };

            reader.onabort = () => {
                reject();
            };

            // Closure to capture the file information.
            reader.onload = e => {
                // Split by a comma to remove the url: prefix
                const data = (e.target!.result as string).split(",")[1];

                this.fetch({
                    type: "POST",
                    url,
                    data,
                    contentType: `image/${file.name.substring(
                        file.name.lastIndexOf(".") + 1
                    )}`
                }).then(() => resolve(), reject);
            };

            // Read in the image file as a data URL.
            reader.readAsDataURL(file);
        });
    }

    /**
     * Gets the list of installed plugins on the server
     */
    public getInstalledPlugins(): Promise<PluginInfo[]> {
        const url = this.getUrl("Plugins");

        return this.getJSON(url);
    }

    /**
     * Gets a user by id
     */
    public getUser(id: string): Promise<UserDto> {
        assertNotNullish("id", id);

        const url = this.getUrl(`Users/${id}`);

        return this.getJSON(url);
    }

    /**
     * Gets a studio
     */
    public getStudio(name: string, userId?: string): Promise<BaseItemDto> {
        assertNotNullish("name", name);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl(`Studios/${this.encodeName(name)}`, options);

        return this.getJSON(url);
    }

    /**
     * Gets a genre
     */
    public getGenre(name: string, userId?: string): Promise<BaseItemDto> {
        assertNotNullish("name", name);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl(`Genres/${this.encodeName(name)}`, options);

        return this.getJSON(url);
    }

    public getMusicGenre(name: string, userId?: string): Promise<BaseItemDto> {
        assertNotNullish("name", name);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl(
            `MusicGenres/${this.encodeName(name)}`,
            options
        );

        return this.getJSON(url);
    }

    /**
     * Gets an artist
     */
    public getArtist(name: string, userId?: string): Promise<BaseItemDto> {
        assertNotNullish("name", name);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl(`Artists/${this.encodeName(name)}`, options);

        return this.getJSON(url);
    }

    /**
     * Gets a Person
     */
    public getPerson(name: string, userId?: string): Promise<BaseItemDto> {
        assertNotNullish("name", name);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl(`Persons/${this.encodeName(name)}`, options);

        return this.getJSON(url);
    }

    public getPublicUsers(): Promise<UserDto[]> {
        const url = this.getUrl("users/public");

        return this.fetch(
            {
                type: "GET",
                url,
                dataType: "json"
            },
            false
        );
    }

    /**
     * Gets all users from the server
     */
    public getUsers(options: GetUsers = {}): Promise<UserDto[]> {
        const url = this.getUrl("users", options);

        return this.getJSON(url);
    }

    /**
     * Gets all available parental ratings from the server
     */
    public getParentalRatings(): Promise<ParentalRating[]> {
        const url = this.getUrl("Localization/ParentalRatings");

        return this.getJSON(url);
    }

    public getDefaultImageQuality(imageType?: ImageType): number {
        return imageType?.toLowerCase() === "backdrop" ? 80 : 90;
    }

    /**
     * Constructs a url for a user image
     *
     * For best results do not specify both width and height together, as aspect ratio might be altered.
     */
    public getUserImageUrl(userId: string, options: ImageRequest): string {
        assertNotNullish("userId", userId);
        assertNotNullish("options", options);
        assertNotNullish("options.Type", options.Type);

        let url = `Users/${userId}/Images/${options.Type}`;

        if (options.Index != null) {
            url += `/${options.Index}`;
        }

        this.normalizeImageOptions(options);

        // Don't put these on the query string
        delete options.Type;
        delete options.Index;

        return this.getUrl(url, options);
    }

    /**
     * Constructs a url for an item image
     *
     * For best results do not specify both width and height together, as aspect ratio might be altered.
     */
    public getImageUrl(itemId: string, options: ImageRequest): string {
        assertNotNullish("itemId", itemId);
        assertNotNullish("options", options);
        assertNotNullish("options.Type", options.Type);

        let url = `Items/${itemId}/Images/${options.Type}`;

        if (options.Index != null) {
            url += `/${options.Index}`;
        }

        options.Quality =
            options.Quality || this.getDefaultImageQuality(options.Type);

        if (this.normalizeImageOptions) {
            this.normalizeImageOptions(options);
        }

        // Don't put these on the query string
        delete options.Type;
        delete options.Index;

        return this.getUrl(url, options);
    }

    public getScaledImageUrl(itemId: string, options: ImageRequest): string {
        assertNotNullish("itemId", itemId);
        assertNotNullish("options", options);
        assertNotNullish("options.Type", options.Type);

        let url = `Items/${itemId}/Images/${options.Type}`;

        if (options.Index != null) {
            url += `/${options.Index}`;
        }

        this.normalizeImageOptions(options);

        // Don't put these on the query string
        delete options.Type;
        delete options.Index;
        delete options.MinScale;

        return this.getUrl(url, options);
    }

    public getThumbImageUrl(
        item: BaseItemDto,
        options?: Partial<ImageRequest>
    ): string | null {
        assertNotNullish("item", item);

        const fullOptions: ImageRequest = {
            Type: ImageType.Thumb,
            ...options
        };

        if (item.ImageTags && item.ImageTags.Thumb) {
            assertNotNullish("item.Id", item.Id);
            fullOptions.Tag = item.ImageTags.Thumb;
            return this.getImageUrl(item.Id, fullOptions);
        } else if (item.ParentThumbItemId) {
            fullOptions.Tag = item.ParentThumbImageTag;
            return this.getImageUrl(item.ParentThumbItemId, fullOptions);
        }

        return null;
    }

    /**
     * Updates a user's password
     */
    public async updateUserPassword(
        userId: string,
        currentPassword: string,
        newPassword: string
    ): Promise<void> {
        assertNotNullish("userId", userId);
        assertNotNullish("currentPassword", currentPassword);
        assertNotNullish("newPassword", newPassword);

        const url = this.getUrl(`Users/${userId}/Password`);

        const data: UpdateUserPassword = {
            CurrentPw: currentPassword || "",
            NewPw: newPassword
        };

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(data),
            contentType: "application/json"
        });
    }

    /**
     * Updates a user's easy password
     * @param {String} userId
     * @param {String} newPassword
     */
    public async updateEasyPassword(
        userId: string,
        newPassword: string
    ): Promise<void> {
        assertNotNullish("userId", userId);
        assertNotNullish("newPassword", newPassword);

        const url = this.getUrl(`Users/${userId}/EasyPassword`);

        const data: UpdateUserEasyPassword = {
            NewPw: newPassword
        };

        await this.fetch({
            type: "POST",
            url,
            data
        });
    }

    /**
     * Resets a user's password
     * @param {String} userId
     */
    public async resetUserPassword(userId: string): Promise<void> {
        assertNotNullish("userId", userId);

        const url = this.getUrl(`Users/${userId}/Password`);

        const data: UpdateUserPassword = {
            ResetPassword: true
        };

        await this.fetch({
            type: "POST",
            url,
            data
        });
    }

    public async resetEasyPassword(userId: string): Promise<void> {
        assertNotNullish("userId", userId);

        const url = this.getUrl(`Users/${userId}/EasyPassword`);

        const postData: UpdateUserEasyPassword = {
            ResetPassword: true
        };

        await this.fetch({
            type: "POST",
            url,
            data: postData
        });
    }

    /**
     * Updates the server's configuration
     * @param {Object} configuration
     */
    public async updateServerConfiguration(
        configuration: ServerConfiguration
    ): Promise<void> {
        assertNotNullish("configuration", configuration);

        const url = this.getUrl("System/Configuration");

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(configuration),
            contentType: "application/json"
        });
    }

    public async updateNamedConfiguration(
        name: string,
        configuration: any
    ): Promise<void> {
        assertNotNullish("name", name);
        assertNotNullish("configuration", configuration);

        const url = this.getUrl(`System/Configuration/${name}`);

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(configuration),
            contentType: "application/json"
        });
    }

    public async updateItem(item: UpdateItem): Promise<void> {
        assertNotNullish("item", item);

        const url = this.getUrl(`Items/${item.Id}`);

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(item),
            contentType: "application/json"
        });
    }

    /**
     * Updates plugin security info
     */
    public async updatePluginSecurityInfo(
        info: PluginSecurityInfo
    ): Promise<void> {
        assertNotNullish("info", info);

        const url = this.getUrl("Plugins/SecurityInfo");

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(info),
            contentType: "application/json"
        });
    }

    /**
     * Creates a user
     */
    public createUser(user: CreateUserByName): Promise<UserDto> {
        assertNotNullish("user", user);

        const url = this.getUrl("Users/New");
        return this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(user),
            dataType: "json",
            contentType: "application/json"
        });
    }

    /**
     * Updates a user
     */
    public async updateUser(user: Partial<UserDto>): Promise<void> {
        assertNotNullish("user", user);

        const url = this.getUrl(`Users/${user.Id}`);

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(user),
            contentType: "application/json"
        });
    }

    public async updateUserPolicy(
        userId: string,
        policy: Partial<UserPolicy>
    ): Promise<void> {
        assertNotNullish("userId", userId);
        assertNotNullish("policy", policy);

        const url = this.getUrl(`Users/${userId}/Policy`);

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(policy),
            contentType: "application/json"
        });
    }

    public async updateUserConfiguration(
        userId: string,
        configuration: Partial<UserConfiguration>
    ): Promise<void> {
        assertNotNullish("userId", userId);
        assertNotNullish("configuration", configuration);

        const url = this.getUrl(`Users/${userId}/Configuration`);

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(configuration),
            contentType: "application/json"
        });
    }

    /**
     * Updates the Triggers for a ScheduledTask
     */
    public async updateScheduledTaskTriggers(
        id: string,
        triggers: Array<Partial<TaskTriggerInfo>>
    ): Promise<void> {
        assertNotNullish("id", id);
        assertNotNullish("triggers", triggers);

        const url = this.getUrl(`ScheduledTasks/${id}/Triggers`);

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(triggers),
            contentType: "application/json"
        });
    }

    /**
     * Updates a plugin's configuration
     */
    public async updatePluginConfiguration(
        pluginId: string,
        configuration: any
    ): Promise<void> {
        assertNotNullish("pluginId", pluginId);
        assertNotNullish("configuration", configuration);

        const url = this.getUrl(`Plugins/${pluginId}/Configuration`);

        await this.fetch({
            type: "POST",
            url,
            data: JSON.stringify(configuration),
            contentType: "application/json"
        });
    }

    public getAncestorItems(
        itemId: string,
        userId?: string
    ): Promise<BaseItemDto[]> {
        assertNotNullish("itemId", itemId);

        const options: GetAncestors = {};

        if (userId) {
            options.UserId = userId;
        }

        const url = this.getUrl(`Items/${itemId}/Ancestors`, options);

        return this.getJSON(url);
    }

    /**
     * Gets items based on a query, typically for children of a folder
     */
    public getItems(
        userId: Optional<string>,
        options?: BaseItemsRequest
    ): Promise<QueryResult<BaseItemDto>> {
        let url;

        if (userId) {
            url = this.getUrl(`Users/${userId}/Items`, options);
        } else {
            url = this.getUrl("Items", options);
        }

        return this.getJSON(url);
    }

    public getResumableItems(
        userId: string,
        options?: BaseItemsRequest
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("userId", userId);

        if (this.isMinServerVersion("3.2.33")) {
            return this.getJSON(
                this.getUrl(`Users/${userId}/Items/Resume`, options)
            );
        }

        return this.getItems(userId, {
            SortBy: ItemSortBy.DatePlayed,
            SortOrder: SortOrder.Descending,
            Filters: ItemFilter.IsResumable,
            Recursive: true,
            CollapseBoxSetItems: false,
            ExcludeLocationTypes: LocationType.Virtual,
            ...options
        });
    }

    public getMovieRecommendations(
        options?: GetMovieRecommendations
    ): Promise<RecommendationDto[]> {
        return this.getJSON(this.getUrl("Movies/Recommendations", options));
    }

    public getUpcomingEpisodes(
        options?: GetUpcomingEpisodes
    ): Promise<QueryResult<BaseItemDto>> {
        return this.getJSON(this.getUrl("Shows/Upcoming", options));
    }

    public getUserViews(
        options: GetUserViews,
        userId: string
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("userId", userId);

        const url = this.getUrl(
            `Users/${userId || this.getCurrentUserId()}/Views`,
            options
        );

        return this.getJSON(url);
    }

    /**
     * Gets artists from an item
     */
    public getArtists(
        userId: string,
        options: BaseItemsRequest = {}
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("userId", userId);

        options.UserId = userId;

        const url = this.getUrl("Artists", options);

        return this.getJSON(url);
    }

    /**
     * Gets artists from an item
     */
    public getAlbumArtists(
        userId: string,
        options: BaseItemsRequest = {}
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("userId", userId);

        options.UserId = userId;

        const url = this.getUrl("Artists/AlbumArtists", options);

        return this.getJSON(url);
    }

    /**
     * Gets genres from an item
     */
    public getGenres(
        userId: string,
        options: BaseItemsRequest = {}
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("userId", userId);

        options.UserId = userId;

        const url = this.getUrl("Genres", options);

        return this.getJSON(url);
    }

    public getMusicGenres(
        userId: string,
        options: BaseItemsRequest = {}
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("userId", userId);

        options.UserId = userId;

        const url = this.getUrl("MusicGenres", options);

        return this.getJSON(url);
    }

    /**
     * Gets people from an item
     */
    public getPeople(
        userId: string,
        options: BaseItemsRequest = {}
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("userId", userId);

        options.UserId = userId;

        const url = this.getUrl("Persons", options);

        return this.getJSON(url);
    }

    /**
     * Gets studios from an item
     */
    public getStudios(
        userId: string,
        options: BaseItemsRequest = {}
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("userId", userId);

        options.UserId = userId;

        const url = this.getUrl("Studios", options);

        return this.getJSON(url);
    }

    /**
     * Gets local trailers for an item
     */
    public getLocalTrailers(
        userId: string,
        itemId: string
    ): Promise<BaseItemDto[]> {
        assertNotNullish("userId", userId);
        assertNotNullish("itemId", itemId);

        const url = this.getUrl(
            `Users/${userId}/Items/${itemId}/LocalTrailers`
        );

        return this.getJSON(url);
    }

    public getAdditionalVideoParts(
        userId: Optional<string>,
        itemId: string
    ): Promise<QueryResult<BaseItemDto>> {
        assertNotNullish("itemId", itemId);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl(`Videos/${itemId}/AdditionalParts`, options);

        return this.getJSON(url);
    }

    public getThemeMedia(
        userId: Optional<string>,
        itemId: string,
        inherit?: boolean
    ): Promise<AllThemeMediaResult> {
        assertNotNullish("itemId", itemId);

        const options: UrlOptions = {
            InheritFromParent: inherit ?? false
        };

        if (userId) {
            options.UserId = userId;
        }

        const url = this.getUrl(`Items/${itemId}/ThemeMedia`, options);

        return this.getJSON(url);
    }

    public async getSearchHints(
        options?: GetSearchHints
    ): Promise<SearchHintResult> {
        const url = this.getUrl("Search/Hints", options);
        const serverId = this.serverId();

        const result = await this.getJSON<SearchHintResult>(url);
        result.SearchHints.forEach(i => {
            i.ServerId = serverId!;
        });
        return result;
    }

    /**
     * Gets special features for an item
     */
    public getSpecialFeatures(
        userId: string,
        itemId: string
    ): Promise<BaseItemDto[]> {
        assertNotNullish("userId", userId);
        assertNotNullish("itemId", itemId);

        const url = this.getUrl(
            `Users/${userId}/Items/${itemId}/SpecialFeatures`
        );

        return this.getJSON(url);
    }

    public markPlayed(
        userId: string,
        itemId: string,
        date?: Date
    ): Promise<UserItemDataDto> {
        assertNotNullish("userId", userId);
        assertNotNullish("itemId", itemId);

        const options: UrlOptions = {};

        if (date) {
            options.DatePlayed = getDateParamValue(date);
        }

        const url = this.getUrl(
            `Users/${userId}/PlayedItems/${itemId}`,
            options
        );

        return this.fetch({
            type: "POST",
            url,
            dataType: "json"
        });
    }

    public markUnplayed(
        userId: string,
        itemId: string
    ): Promise<UserItemDataDto> {
        assertNotNullish("userId", userId);
        assertNotNullish("itemId", itemId);

        const url = this.getUrl(`Users/${userId}/PlayedItems/${itemId}`);

        return this.fetch({
            type: "DELETE",
            url,
            dataType: "json"
        });
    }

    /**
     * Updates a user's favorite status for an item.
     */
    public updateFavoriteStatus(
        userId: string,
        itemId: string,
        isFavorite: boolean
    ): Promise<void> {
        assertNotNullish("userId", userId);
        assertNotNullish("itemId", itemId);
        assertNotNullish("isFavorite", isFavorite);

        const url = this.getUrl(`Users/${userId}/FavoriteItems/${itemId}`);

        const method = isFavorite ? "POST" : "DELETE";

        return this.fetch({
            type: method,
            url,
            dataType: "json"
        });
    }

    /**
     * Updates a user's personal rating for an item
     */
    public updateUserItemRating(
        userId: string,
        itemId: string,
        likes: boolean
    ): Promise<UserItemDataDto> {
        assertNotNullish("userId", userId);
        assertNotNullish("itemId", itemId);
        assertNotNullish("likes", likes);

        const url = this.getUrl(`Users/${userId}/Items/${itemId}/Rating`, {
            likes
        });

        return this.fetch({
            type: "POST",
            url,
            dataType: "json"
        });
    }

    public getItemCounts(userId: string): Promise<ItemCounts> {
        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl("Items/Counts", options);

        return this.getJSON(url);
    }

    /**
     * Clears a user's personal rating for an item
     */
    public clearUserItemRating(
        userId: string,
        itemId: string
    ): Promise<UserItemDataDto> {
        assertNotNullish("userId", userId);
        assertNotNullish("itemId", itemId);

        const url = this.getUrl(`Users/${userId}/Items/${itemId}/Rating`);

        return this.fetch({
            type: "DELETE",
            url,
            dataType: "json"
        });
    }

    /**
     * Reports the user has started playing something
     */
    public async reportPlaybackStart(
        options: PlaybackStartInfo
    ): Promise<void> {
        assertNotNullish("options", options);

        this.lastPlaybackProgressReport = 0;
        this.lastPlaybackProgressReportTicks = null;
        this.stopBitrateDetection();

        const url = this.getUrl("Sessions/Playing");

        await this.fetch({
            type: "POST",
            data: JSON.stringify(options),
            contentType: "application/json",
            url
        });
    }

    /**
     * Reports progress viewing an item
     */
    public async reportPlaybackProgress(
        options: PlaybackProgressInfo
    ): Promise<void> {
        assertNotNullish("options", options);

        const newPositionTicks = options.PositionTicks;

        if ((options.EventName || "timeupdate") === "timeupdate") {
            const now = new Date().getTime();
            const msSinceLastReport =
                now - (this.lastPlaybackProgressReport || 0);

            if (msSinceLastReport <= 10000) {
                if (!newPositionTicks) {
                    return Promise.resolve();
                }

                const expectedReportTicks =
                    msSinceLastReport * 10000 +
                    (this.lastPlaybackProgressReportTicks || 0);

                if (
                    Math.abs((newPositionTicks || 0) - expectedReportTicks) <
                    5000 * 10000
                ) {
                    return Promise.resolve();
                }
            }

            this.lastPlaybackProgressReport = now;
        } else {
            // allow the next timeupdate
            this.lastPlaybackProgressReport = 0;
        }

        this.lastPlaybackProgressReportTicks = newPositionTicks;
        const url = this.getUrl("Sessions/Playing/Progress");

        await this.fetch({
            type: "POST",
            data: JSON.stringify(options),
            contentType: "application/json",
            url
        });
    }

    /**
     * Reports a user has stopped playing an item
     */
    public async reportPlaybackStopped(
        options: PlaybackStopInfo
    ): Promise<void> {
        assertNotNullish("options", options);

        this.lastPlaybackProgressReport = 0;
        this.lastPlaybackProgressReportTicks = null;
        this.redetectBitrate();

        const url = this.getUrl("Sessions/Playing/Stopped");

        await this.fetch({
            type: "POST",
            data: JSON.stringify(options),
            contentType: "application/json",
            url
        });
    }

    public async sendPlayCommand(
        sessionId: string,
        options: PlaystateRequest
    ): Promise<void> {
        assertNotNullish("sessionId", sessionId);
        assertNotNullish("options", options);

        const url = this.getUrl(`Sessions/${sessionId}/Playing`, options);

        await this.fetch({
            type: "POST",
            url
        });
    }

    public async sendCommand(
        sessionId: string,
        command: GeneralCommand
    ): Promise<void> {
        assertNotNullish("sessionId", sessionId);
        assertNotNullish("command", command);

        const url = this.getUrl(`Sessions/${sessionId}/Command`);

        const ajaxOptions: RequestOptions = {
            type: "POST",
            url,
            data: JSON.stringify(command),
            contentType: "application/json"
        };

        await this.fetch(ajaxOptions);
    }

    public async sendMessageCommand(
        sessionId: string,
        options: SendMessageCommand
    ): Promise<void> {
        assertNotNullish("sessionId", sessionId);
        assertNotNullish("options", options);

        const url = this.getUrl(`Sessions/${sessionId}/Message`);

        const ajaxOptions: RequestOptions = {
            type: "POST",
            url,
            data: JSON.stringify(options),
            contentType: "application/json"
        };

        await this.fetch(ajaxOptions);
    }

    public async sendPlayStateCommand(
        sessionId: string,
        command: string,
        options: PlaystateRequest = {}
    ): Promise<void> {
        assertNotNullish("sessionId", sessionId);
        assertNotNullish("command", command);

        const url = this.getUrl(
            `Sessions/${sessionId}/Playing/${command}`,
            options
        );

        await this.fetch({
            type: "POST",
            url
        });
    }

    public createPackageReview(review: any): Promise<unknown> {
        const url = this.getUrl(`Packages/Reviews/${review.id}`, review);

        return this.fetch({
            type: "POST",
            url
        });
    }

    public getPackageReviews(
        packageId: string,
        minRating: number,
        maxRating: number,
        limit: number
    ): Promise<unknown> {
        if (!packageId) {
            throw new Error("null packageId");
        }

        const options: UrlOptions = {};

        if (minRating) {
            options.MinRating = minRating;
        }
        if (maxRating) {
            options.MaxRating = maxRating;
        }
        if (limit) {
            options.Limit = limit;
        }

        const url = this.getUrl(`Packages/${packageId}/Reviews`, options);

        return this.getJSON(url);
    }

    public getSavedEndpointInfo(): Optional<EndPointInfo> {
        return this._endPointInfo;
    }

    public async getEndpointInfo(): Promise<EndPointInfo> {
        const savedValue = this._endPointInfo;
        if (savedValue) {
            return Promise.resolve(savedValue);
        }

        const endPointInfo = await this.getJSON(this.getUrl("System/Endpoint"));
        this.setSavedEndpointInfo(endPointInfo);
        return endPointInfo;
    }

    public getLatestItems(
        options: GetLatestMedia = {}
    ): Promise<BaseItemDto[]> {
        return this.getJSON(
            this.getUrl(
                `Users/${this.getCurrentUserId()}/Items/Latest`,
                options
            )
        );
    }

    public getFilters(options?: GetQueryFilters): Promise<QueryFilters> {
        return this.getJSON(this.getUrl("Items/Filters2", options));
    }

    public setSystemInfo(info: PublicSystemInfo) {
        this._serverVersion = info.Version;
    }

    public serverVersion(): Optional<string> {
        return this._serverVersion;
    }

    public isMinServerVersion(version: string): boolean {
        const serverVersion = this.serverVersion();

        return !!serverVersion && compareVersions(serverVersion, version) >= 0;
    }

    public handleMessageReceived(msg: WebSocketMessage) {
        this.onMessageReceivedInternal(msg);
    }

    protected normalizeImageOptions(options: ImageRequest) {
        let ratio = this._devicePixelRatio || 1;

        if (ratio) {
            if (options.MinScale) {
                ratio = Math.max(options.MinScale as number, ratio);
            }

            if (options.Width) {
                options.Width = Math.round((options.Width as number) * ratio);
            }
            if (options.Height) {
                options.Height = Math.round((options.Height as number) * ratio);
            }
            if (options.MaxWidth) {
                options.MaxWidth = Math.round(
                    (options.MaxWidth as number) * ratio
                );
            }
            if (options.MaxHeight) {
                options.MaxHeight = Math.round(
                    (options.MaxHeight as number) * ratio
                );
            }
        }

        options.Quality =
            options.Quality || this.getDefaultImageQuality(options.Type);
    }

    private detectBitrateWithEndpointInfo(
        endpointInfo: Partial<EndPointInfo>
    ): Promise<number> {
        if (endpointInfo.IsInNetwork) {
            const result = 140000000;
            this.lastDetectedBitrate = result;
            this.lastDetectedBitrateTime = new Date().getTime();
            return Promise.resolve(result);
        }

        return this.detectBitrateInternal([
            {
                bytes: 500000,
                threshold: 500000
            },
            {
                bytes: 1000000,
                threshold: 20000000
            },
            {
                bytes: 3000000,
                threshold: 50000000
            }
        ]);
    }

    private async detectBitrateInternal(
        tests: Array<{ bytes: number; threshold: number }>
    ): Promise<number> {
        let bitrate: number | undefined;

        for (const test of tests) {
            try {
                bitrate = await this.getDownloadSpeed(test.bytes);
                if (bitrate < test.threshold) {
                    return this.normalizeReturnBitrate(bitrate);
                }
            } catch (_) {
                this.normalizeReturnBitrate(bitrate);
            }
        }
        return this.normalizeReturnBitrate(bitrate);
    }

    private setSavedEndpointInfo(info: EndPointInfo | null) {
        this._endPointInfo = info;
    }

    private getTryConnectPromise(
        url: string,
        state: any,
        resolve: () => void,
        reject: () => void
    ): void {
        console.log(`getTryConnectPromise ${url}`);

        fetchWithTimeout(
            this.getUrl("system/info/public", null, url),
            {
                method: "GET",
                // Fixme: This is not correct,
                headers: {
                    accept: "application/json"
                }

                // Commenting this out since the fetch api doesn't have a timeout option yet
                // timeout: timeout
            },
            15000
        ).then(
            () => {
                if (!state.resolved) {
                    state.resolved = true;

                    console.log(`Reconnect succeeded to ${url}`);
                    this.serverAddress(url);
                    resolve();
                }
            },
            () => {
                if (!state.resolved) {
                    console.log(`Reconnect failed to ${url}`);

                    state.rejects++;
                    if (state.rejects >= state.numAddresses) {
                        reject();
                    }
                }
            }
        );
    }

    private tryReconnectInternal(): Promise<void> {
        const addresses: Array<{ url: string; timeout: number }> = [];
        const addressesStrings: string[] = [];

        const serverInfo = this.requireServerInfo;
        if (
            serverInfo.LocalAddress &&
            addressesStrings.indexOf(serverInfo.LocalAddress) === -1
        ) {
            addresses.push({ url: serverInfo.LocalAddress, timeout: 0 });
            addressesStrings.push(addresses[addresses.length - 1].url);
        }
        if (
            serverInfo.ManualAddress &&
            addressesStrings.indexOf(serverInfo.ManualAddress) === -1
        ) {
            addresses.push({ url: serverInfo.ManualAddress, timeout: 100 });
            addressesStrings.push(addresses[addresses.length - 1].url);
        }
        if (
            serverInfo.RemoteAddress &&
            addressesStrings.indexOf(serverInfo.RemoteAddress) === -1
        ) {
            addresses.push({ url: serverInfo.RemoteAddress, timeout: 200 });
            addressesStrings.push(addresses[addresses.length - 1].url);
        }

        console.log(`tryReconnect: ${addressesStrings.join("|")}`);

        return new Promise((resolve, reject) => {
            const state: any = {};
            state.numAddresses = addresses.length;
            state.rejects = 0;

            addresses.map(url => {
                setTimeout(() => {
                    if (!state.resolved) {
                        this.getTryConnectPromise(
                            url.url,
                            state,
                            resolve,
                            reject
                        );
                    }
                }, url.timeout);
            });
        });
    }

    private async tryReconnect(retryCount: number = 0) {
        if (retryCount >= 20) {
            return Promise.reject();
        }

        try {
            return this.tryReconnectInternal();
        } catch (err) {
            console.log(`error in tryReconnectInternal: ${err || ""}`);
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    this.tryReconnect(retryCount + 1).then(resolve, reject);
                }, 500);
            });
        }
    }

    private getCachedUser(userId: string): UserDto | null {
        const serverId = this.serverId();
        if (!serverId) {
            return null;
        }

        const json = this.appStorage.getItem(`user-${userId}-${serverId}`);

        if (json) {
            return JSON.parse(json);
        }

        return null;
    }

    private onWebSocketMessageListener() {
        return (e: MessageEvent) => {
            const message = JSON.parse(e.data) as WebSocketMessage;
            this.onMessageReceivedInternal(message);
        };
    }

    private onMessageReceivedInternal(msg: WebSocketMessage) {
        const messageId = msg.MessageId;
        if (messageId) {
            // message was already received via another protocol
            if (this.messageIdsReceived[messageId]) {
                return;
            }

            this.messageIdsReceived[messageId] = true;
        }

        if (msg.MessageType === "UserDeleted") {
            this._currentUser = null;
        } else if (
            msg.MessageType === "UserUpdated" ||
            msg.MessageType === "UserConfigurationUpdated"
        ) {
            const user = msg.Data;
            if (user.Id === this.getCurrentUserId()) {
                this._currentUser = null;
            }
        }

        events.trigger(this, "message", [msg]);
    }

    private onWebSocketOpenListener() {
        return () => {
            console.log("web socket connection opened");
            events.trigger(this, "websocketopen");
        };
    }

    private onWebSocketErrorListener() {
        return () => {
            events.trigger(this, "websocketerror");
        };
    }

    private setSocketOnClose(socket: WebSocket) {
        socket.onclose = () => {
            console.log("web socket closed");

            if (this._webSocket === socket) {
                console.log("nulling out web socket");
                this._webSocket = undefined;
            }

            setTimeout(() => {
                events.trigger(this, "websocketclose");
            }, 0);
        };
    }

    private normalizeReturnBitrate(bitrate?: number): number {
        if (!bitrate) {
            if (this.lastDetectedBitrate) {
                return this.lastDetectedBitrate;
            }

            throw new Error(
                "bitrate must be set if no previous bitrate has been detected"
            );
        }

        let result = Math.round(bitrate * 0.7);

        // allow configuration of this
        if (this.getMaxBandwidth) {
            const maxRate = this.getMaxBandwidth();
            if (maxRate) {
                result = Math.min(result, maxRate);
            }
        }

        this.lastDetectedBitrate = result;
        this.lastDetectedBitrateTime = new Date().getTime();

        return result;
    }

    private getRemoteImagePrefix(options: HasMediaId) {
        let urlPrefix;

        if (options.artist) {
            urlPrefix = `Artists/${this.encodeName(options.artist)}`;
            delete options.artist;
        } else if (options.person) {
            urlPrefix = `Persons/${this.encodeName(options.person)}`;
            delete options.person;
        } else if (options.genre) {
            urlPrefix = `Genres/${this.encodeName(options.genre)}`;
            delete options.genre;
        } else if (options.musicGenre) {
            urlPrefix = `MusicGenres/${this.encodeName(options.musicGenre)}`;
            delete options.musicGenre;
        } else if (options.studio) {
            urlPrefix = `Studios/${this.encodeName(options.studio)}`;
            delete options.studio;
        } else {
            urlPrefix = `Items/${options.itemId}`;
            delete options.itemId;
        }

        return urlPrefix;
    }

    private redetectBitrate() {
        this.stopBitrateDetection();

        if (
            this.accessToken() &&
            this.enableAutomaticBitrateDetection !== false
        ) {
            this.detectTimeout = setTimeout(
                () => this.redetectBitrateInternal(),
                6000
            );
        }
    }

    private redetectBitrateInternal() {
        if (this.accessToken()) {
            this.detectBitrate();
        }
    }

    private stopBitrateDetection() {
        if (this.detectTimeout) {
            clearTimeout(this.detectTimeout);
        }
    }
}

function compareVersions(a: string, b: string): CompRelation {
    // -1 a is smaller
    // 1 a is larger
    // 0 equal
    const ap = a.split(".");
    const bp = b.split(".");

    for (let i = 0, length = Math.max(ap.length, bp.length); i < length; i++) {
        const aVal = parseInt(a[i] || "0", 10);
        const bVal = parseInt(b[i] || "0", 10);

        if (aVal < bVal) {
            return CompRelation.IS_SMALLER_THAN;
        }

        if (aVal > bVal) {
            return CompRelation.IS_LARGER_THAN;
        }
    }

    return CompRelation.EQUALS;
}

export default ApiClient;
