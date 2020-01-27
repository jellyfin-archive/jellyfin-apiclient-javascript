import events from "./events";
import { CompRelation, Optional, ServerInfo, UrlOptions } from "./types";
import { getDateParamValue, snbn } from "./utils";

function redetectBitrate(instance: ApiClient) {
    stopBitrateDetection(instance);

    if (
        instance.accessToken() &&
        instance.enableAutomaticBitrateDetection !== false
    ) {
        setTimeout(redetectBitrateInternal.bind(instance), 6000);
    }
}

function redetectBitrateInternal() {
    if (this.accessToken()) {
        this.detectBitrate();
    }
}

function stopBitrateDetection(instance) {
    if (instance.detectTimeout) {
        clearTimeout(instance.detectTimeout);
    }
}

function replaceAll(originalString, strReplace, strWith) {
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

function paramsToString(params: UrlOptions) {
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
    options: RequestInit,
    timeoutMs: number
): Promise<Response> {
    return new Promise(async (resolve, reject) => {
        const timeout = setTimeout(reject, timeoutMs);

        options = options || {};
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

function getFetchPromise(request: any): Promise<Response> {
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
    public appStorage: any;
    protected serverInfo?: ServerInfo;
    private _serverAddress: string;
    private readonly _deviceId: string;
    private _deviceName: string;
    private readonly _appName: string;
    private readonly _appVersion: string;
    private readonly _devicePixelRatio: number;
    private _currentUser: null | any = null;
    private _webSocket?: WebSocket;
    private enableAutomaticNetworking?: boolean;
    private lastFetch?: number;
    private lastDetectedBitrate?: number;
    private lastDetectedBitrateTime?: number;
    private _endPointInfo?: any;
    private _serverVersion?: string;
    private lastPlaybackProgressReport?: number;
    private lastPlaybackProgressReportTicks?: null | number;

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

    public get requireServerInfo(): ServerInfo {
        if (!this.serverInfo) {
            throw Error("Server info was unexpectedly undefined");
        }

        return this.serverInfo;
    }

    public appName() {
        return this._appName;
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

    public appVersion() {
        return this._appVersion;
    }

    public deviceName() {
        return this.deviceName;
    }

    public deviceId() {
        return this._deviceId;
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

        redetectBitrate(this);
    }

    /**
     * Creates an api url based on a handler name and query string parameters
     */
    public getUrl(
        name: string,
        params?: UrlOptions | null,
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
    public fetch(request: any, includeAuthorization?: boolean) {
        if (!request) {
            throw new Error("Request cannot be null");
        }

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
        redetectBitrate(this);
    }

    /**
     * Gets or sets the current user id.
     */
    public getCurrentUserId() {
        return this.serverInfo?.UserId;
    }

    public requireUserId(): string {
        const uid = this.serverInfo?.UserId;
        snbn("userId", uid);
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
     * Wraps around jQuery ajax methods to add additional info to the request.
     */
    public ajax(
        request: any,
        includeAuthorization?: boolean
    ): Promise<any> {
        if (!request) {
            throw new Error("Request cannot be null");
        }

        return this.fetch(request, includeAuthorization);
    }

    /**
     * Gets or sets the current user id.
     */
    public getCurrentUser(enableCache?: boolean) {
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
        stopBitrateDetection(this);
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

            return this.ajax({
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
    public authenticateUserByName(name: string, password?: string) {
        snbn("name", name);

        const url = this.getUrl("Users/authenticatebyname");
        const instance = this;

        return new Promise((resolve, reject) => {
            const postData = {
                Username: name,
                Pw: password || ""
            };

            this
                .ajax({
                    type: "POST",
                    url,
                    data: JSON.stringify(postData),
                    dataType: "json",
                    contentType: "application/json"
                })
                .then(result => {
                    const afterOnAuthenticated = () => {
                        redetectBitrate(instance);
                        resolve(result);
                    };

                    if (this.onAuthenticated) {
                        this
                            .onAuthenticated(instance, result)
                            .then(afterOnAuthenticated);
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

        const msg: any = { MessageType: name };

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

    public get(url: string): any {
        return this.ajax({
            type: "GET",
            url
        });
    }

    public getJSON(url: string, includeAuthorization?: boolean): Promise<any> {
        return this.fetch(
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
        snbn("server", server);

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

    public getDownloadSpeed(byteSize: number): Promise<number> {
        const url = this.getUrl("Playback/BitrateTest", {
            Size: byteSize.toString()
        });

        const now = new Date().getTime();

        return this.ajax({
            type: "GET",
            url,
            timeout: 5000
        }).then(() => {
            const responseTimeSeconds = (new Date().getTime() - now) / 1000;
            const bytesPerSecond = byteSize / responseTimeSeconds;
            return Math.round(bytesPerSecond * 8);
        });
    }

    public detectBitrate(force: boolean) {
        if (
            !force &&
            this.lastDetectedBitrate &&
            new Date().getTime() - (this.lastDetectedBitrateTime || 0) <=
                3600000
        ) {
            return Promise.resolve(this.lastDetectedBitrate);
        }

        return this.getEndpointInfo().then(
            info => this.detectBitrateWithEndpointInfo(info),
            _ => this.detectBitrateWithEndpointInfo({})
        );
    }

    /**
     * Gets an item from the server
     * Omit itemId to get the root folder.
     */
    public getItem(userId: Optional<string>, itemId: string): any {
        snbn("itemId", itemId);

        const url = userId
            ? this.getUrl(`Users/${userId}/Items/${itemId}`)
            : this.getUrl(`Items/${itemId}`);

        return this.getJSON(url);
    }

    /**
     * Gets the root folder from the server
     */
    public getRootFolder(userId: string): any {
        snbn("userId", userId);

        const url = this.getUrl(`Users/${userId}/Items/Root`);

        return this.getJSON(url);
    }

    public getNotificationSummary(userId: string): any {
        snbn("userId", userId);

        const url = this.getUrl(`Notifications/${userId}/Summary`);

        return this.getJSON(url);
    }

    public getNotifications(userId: string, options?: UrlOptions): any {
        snbn("userId", userId);

        const url = this.getUrl(`Notifications/${userId}`, options || {});

        return this.getJSON(url);
    }

    public markNotificationsRead(userId: string, idList: string[], isRead?: boolean): any {
        snbn("userId", userId);
        snbn("idList", idList);

        const suffix = isRead ? "Read" : "Unread";

        const params = {
            UserId: userId,
            Ids: idList.join(",")
        };

        const url = this.getUrl(`Notifications/${userId}/${suffix}`, params);

        return this.ajax({
            type: "POST",
            url
        });
    }

    public getRemoteImageProviders(options: UrlOptions): any {
        snbn("options", options);

        const urlPrefix = this.getRemoteImagePrefix(options);

        const url = this.getUrl(`${urlPrefix}/RemoteImages/Providers`, options);

        return this.getJSON(url);
    }

    public getAvailableRemoteImages(options: UrlOptions): any {
        snbn("options", options);

        const urlPrefix = this.getRemoteImagePrefix(options);

        const url = this.getUrl(`${urlPrefix}/RemoteImages`, options);

        return this.getJSON(url);
    }

    public downloadRemoteImage(options: UrlOptions): any {
        snbn("options", options);

        const urlPrefix = this.getRemoteImagePrefix(options);

        const url = this.getUrl(`${urlPrefix}/RemoteImages/Download`, options);

        return this.ajax({
            type: "POST",
            url
        });
    }

    public getRecordingFolders(userId: string): any {
        snbn("userId", userId);

        const url = this.getUrl("LiveTv/Recordings/Folders", { userId });

        return this.getJSON(url);
    }

    public getLiveTvInfo(options?: UrlOptions): any {
        const url = this.getUrl("LiveTv/Info", options || {});

        return this.getJSON(url);
    }

    public getLiveTvGuideInfo(options?: UrlOptions): any {
        const url = this.getUrl("LiveTv/GuideInfo", options || {});

        return this.getJSON(url);
    }

    public getLiveTvChannel(id: string, userId?: string): any {
        snbn("id", id);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl(`LiveTv/Channels/${id}`, options);

        return this.getJSON(url);
    }

    public getLiveTvChannels(options?: UrlOptions): any {
        const url = this.getUrl("LiveTv/Channels", options || {});

        return this.getJSON(url);
    }

    public getLiveTvPrograms(options: UrlOptions = {}): any {
        if (options.channelIds && (options.channelIds as string).length > 1800) {
            return this.ajax({
                type: "POST",
                url: this.getUrl("LiveTv/Programs"),
                data: JSON.stringify(options),
                contentType: "application/json",
                dataType: "json"
            });
        } else {
            return this.ajax({
                type: "GET",
                url: this.getUrl("LiveTv/Programs", options),
                dataType: "json"
            });
        }
    }

    public getLiveTvRecommendedPrograms(options: UrlOptions = {}): any {
        return this.ajax({
            type: "GET",
            url: this.getUrl("LiveTv/Programs/Recommended", options),
            dataType: "json"
        });
    }

    public getLiveTvRecordings(options?: UrlOptions): any {
        const url = this.getUrl("LiveTv/Recordings", options || {});

        return this.getJSON(url);
    }

    public getLiveTvRecordingSeries(options?: UrlOptions): any {
        const url = this.getUrl("LiveTv/Recordings/Series", options || {});

        return this.getJSON(url);
    }

    public getLiveTvRecordingGroups(options?: UrlOptions): any {
        const url = this.getUrl("LiveTv/Recordings/Groups", options || {});

        return this.getJSON(url);
    }

    public getLiveTvRecordingGroup(id: string): any {
        snbn("id", id);

        const url = this.getUrl(`LiveTv/Recordings/Groups/${id}`);

        return this.getJSON(url);
    }

    public getLiveTvRecording(id: string, userId?: string): any {
        snbn("id", id);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl(`LiveTv/Recordings/${id}`, options);

        return this.getJSON(url);
    }

    public getLiveTvProgram(id: string, userId?: string): any {
        snbn("id", id);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl(`LiveTv/Programs/${id}`, options);

        return this.getJSON(url);
    }

    public deleteLiveTvRecording(id: string): any {
        snbn("id", id);

        const url = this.getUrl(`LiveTv/Recordings/${id}`);

        return this.ajax({
            type: "DELETE",
            url
        });
    }

    public cancelLiveTvTimer(id: string): any {
        snbn("id", id);

        const url = this.getUrl(`LiveTv/Timers/${id}`);

        return this.ajax({
            type: "DELETE",
            url
        });
    }

    public getLiveTvTimers(options?: UrlOptions): any {
        const url = this.getUrl("LiveTv/Timers", options || {});

        return this.getJSON(url);
    }

    public getLiveTvTimer(id: string): any {
        snbn("id", id);

        const url = this.getUrl(`LiveTv/Timers/${id}`);

        return this.getJSON(url);
    }

    public getNewLiveTvTimerDefaults(options: UrlOptions = {}) {
        const url = this.getUrl("LiveTv/Timers/Defaults", options);

        return this.getJSON(url);
    }

    public createLiveTvTimer(item: any): any {
        snbn("item", item);

        const url = this.getUrl("LiveTv/Timers");

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(item),
            contentType: "application/json"
        });
    }

    public updateLiveTvTimer(item: any): any {
        snbn("item", item);

        const url = this.getUrl(`LiveTv/Timers/${item.Id}`);

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(item),
            contentType: "application/json"
        });
    }

    public resetLiveTvTuner(id: string): any {
        snbn("id", id);

        const url = this.getUrl(`LiveTv/Tuners/${id}/Reset`);

        return this.ajax({
            type: "POST",
            url
        });
    }

    public getLiveTvSeriesTimers(options?: UrlOptions) {
        const url = this.getUrl("LiveTv/SeriesTimers", options || {});

        return this.getJSON(url);
    }

    public getLiveTvSeriesTimer(id: string): any {
        snbn("id", id);

        const url = this.getUrl(`LiveTv/SeriesTimers/${id}`);

        return this.getJSON(url);
    }

    public cancelLiveTvSeriesTimer(id: string): any {
        snbn("id", id);

        const url = this.getUrl(`LiveTv/SeriesTimers/${id}`);

        return this.ajax({
            type: "DELETE",
            url
        });
    }

    public createLiveTvSeriesTimer(item: any): any {
        snbn("item", item);

        const url = this.getUrl("LiveTv/SeriesTimers");

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(item),
            contentType: "application/json"
        });
    }

    public updateLiveTvSeriesTimer(item: any): any {
        snbn("item", item);

        const url = this.getUrl(`LiveTv/SeriesTimers/${item.Id}`);

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(item),
            contentType: "application/json"
        });
    }

    public getRegistrationInfo(feature: string): any {
        snbn("feature", feature);

        const url = this.getUrl(`Registrations/${feature}`);

        return this.getJSON(url);
    }

    /**
     * Gets the current server status
     */
    public getSystemInfo(itemId: string): any {
        snbn("itemId", itemId);

        const url = this.getUrl("System/Info");

        const instance = this;

        return this.getJSON(url).then(info => {
            instance.setSystemInfo(info);
            return Promise.resolve(info);
        });
    }

    public getSyncStatus(itemId: string): any {
        snbn("itemId", itemId);

        const url = this.getUrl(`Sync/${itemId}/Status`);

        return this.ajax({
            url,
            type: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify({
                TargetId: this.deviceId()
            })
        });
    }

    /**
     * Gets the current server status
     */
    public getPublicSystemInfo(): any {
        const url = this.getUrl("System/Info/Public");

        const instance = this;

        return this.getJSON(url).then(info => {
            instance.setSystemInfo(info);
            return Promise.resolve(info);
        });
    }

    public getInstantMixFromItem(itemId: string, options?: UrlOptions): any {
        snbn("itemId", itemId);

        const url = this.getUrl(`Items/${itemId}/InstantMix`, options);

        return this.getJSON(url);
    }

    public getEpisodes(itemId: string, options?: UrlOptions): any {
        snbn("itemId", itemId);

        const url = this.getUrl(`Shows/${itemId}/Episodes`, options);

        return this.getJSON(url);
    }

    public getDisplayPreferences(id: string, userId: string, app: any): any {
        snbn("id", id);
        snbn("userId", userId);
        snbn("app", app);

        const url = this.getUrl(`DisplayPreferences/${id}`, {
            userId,
            client: app
        });

        return this.getJSON(url);
    }

    public updateDisplayPreferences(id: string, obj: any, userId: string, app: any): any {
        snbn("id", id);
        snbn("obj", obj);
        snbn("userId", userId);
        snbn("app", app);

        const url = this.getUrl(`DisplayPreferences/${id}`, {
            userId,
            client: app
        });

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(obj),
            contentType: "application/json"
        });
    }

    public getSeasons(itemId: string, options?: UrlOptions): any {


        const url = this.getUrl(`Shows/${itemId}/Seasons`, options);

        return this.getJSON(url);
    }

    public getSimilarItems(itemId: string, options?: UrlOptions): any {
        snbn("itemId", itemId);

        const url = this.getUrl(`Items/${itemId}/Similar`, options);

        return this.getJSON(url);
    }

    /**
     * Gets all cultures known to the server
     */
    public getCultures(): any {
        const url = this.getUrl("Localization/cultures");

        return this.getJSON(url);
    }

    /**
     * Gets all countries known to the server
     */
    public getCountries(): any {
        const url = this.getUrl("Localization/countries");

        return this.getJSON(url);
    }

    public getPlaybackInfo(itemId: string, options: Optional<UrlOptions>, deviceProfile: any): any {
        snbn("itemId", itemId);
        snbn("deviceProfile", deviceProfile);

        const postData = {
            DeviceProfile: deviceProfile
        };

        return this.ajax({
            url: this.getUrl(`Items/${itemId}/PlaybackInfo`, options),
            type: "POST",
            data: JSON.stringify(postData),
            contentType: "application/json",
            dataType: "json"
        });
    }

    public getLiveStreamMediaInfo(liveStreamId: string): any {
        snbn("liveStreamId", liveStreamId);

        const postData = {
            LiveStreamId: liveStreamId
        };

        return this.ajax({
            url: this.getUrl("LiveStreams/MediaInfo"),
            type: "POST",
            data: JSON.stringify(postData),
            contentType: "application/json",
            dataType: "json"
        });
    }

    public getIntros(itemId: string): any {
        snbn("itemId", itemId);

        return this.getJSON(
            this.getUrl(
                `Users/${this.getCurrentUserId()}/Items/${itemId}/Intros`
            )
        );
    }

    /**
     * Gets the directory contents of a path on the server
     */
    public getDirectoryContents(path: string, options?: UrlOptions): any {
        snbn("path", path);

        options = options || {};

        options.path = path;

        const url = this.getUrl("Environment/DirectoryContents", options);

        return this.getJSON(url);
    }

    /**
     * Gets shares from a network device
     */
    public getNetworkShares(path: string): any {
        snbn("path", path);

        const options: UrlOptions = {};
        options.path = path;

        const url = this.getUrl("Environment/NetworkShares", options);

        return this.getJSON(url);
    }

    /**
     * Gets the parent of a given path
     */
    public getParentPath(path: string): any {
        snbn("path", path);

        const options: UrlOptions = {};
        options.path = path;

        const url = this.getUrl("Environment/ParentPath", options);

        return this.ajax({
            type: "GET",
            url,
            dataType: "text"
        });
    }

    /**
     * Gets a list of physical drives from the server
     */
    public getDrives(): any {
        const url = this.getUrl("Environment/Drives");

        return this.getJSON(url);
    }

    /**
     * Gets a list of network devices from the server
     */
    public getNetworkDevices(): any {
        const url = this.getUrl("Environment/NetworkDevices");

        return this.getJSON(url);
    }

    /**
     * Cancels a package installation
     */
    public cancelPackageInstallation(installationId: string): any {
        snbn("installationId", installationId);

        const url = this.getUrl(`Packages/Installing/${installationId}`);

        return this.ajax({
            type: "DELETE",
            url
        });
    }

    /**
     * Refreshes metadata for an item
     */
    public refreshItem(itemId: string, options?: UrlOptions): any {
        const url = this.getUrl(`Items/${itemId}/Refresh`, options || {});

        return this.ajax({
            type: "POST",
            url
        });
    }

    /**
     * Installs or updates a new plugin
     */
    public installPlugin(name: string, guid: string, updateClass: string, version?: string): any {
        snbn("name", name);
        snbn("guid", guid);
        snbn("updateClass", updateClass);

        const options: UrlOptions = {
            updateClass,
            AssemblyGuid: guid
        };

        if (version) {
            options.version = version;
        }

        const url = this.getUrl(`Packages/Installed/${name}`, options);

        return this.ajax({
            type: "POST",
            url
        });
    }

    /**
     * Instructs the server to perform a restart.
     */
    public restartServer(): any {
        const url = this.getUrl("System/Restart");

        return this.ajax({
            type: "POST",
            url
        });
    }

    /**
     * Instructs the server to perform a shutdown.
     */
    public shutdownServer(): any {
        const url = this.getUrl("System/Shutdown");

        return this.ajax({
            type: "POST",
            url
        });
    }

    /**
     * Gets information about an installable package
     */
    public getPackageInfo(name: string, guid: string): any {
        snbn("name", name);
        snbn("guid", guid);

        const options: UrlOptions = {
            AssemblyGuid: guid
        };

        const url = this.getUrl(`Packages/${name}`, options);

        return this.getJSON(url);
    }

    /**
     * Gets the virtual folder list
     */
    public getVirtualFolders(): any {
        let url = "Library/VirtualFolders";

        url = this.getUrl(url);

        return this.getJSON(url);
    }

    /**
     * Gets all the paths of the locations in the physical root.
     */
    public getPhysicalPaths(): any {
        const url = this.getUrl("Library/PhysicalPaths");

        return this.getJSON(url);
    }

    /**
     * Gets the current server configuration
     */
    public getServerConfiguration(): any {
        const url = this.getUrl("System/Configuration");

        return this.getJSON(url);
    }

    /**
     * Gets the current server configuration
     */
    public getDevicesOptions(): any {
        const url = this.getUrl("System/Configuration/devices");

        return this.getJSON(url);
    }

    /**
     * Gets the current server configuration
     */
    public getContentUploadHistory(): any {
        const url = this.getUrl("Devices/CameraUploads", {
            DeviceId: this.deviceId()
        });

        return this.getJSON(url);
    }

    public getNamedConfiguration(name: string): any {
        snbn("name", name);

        const url = this.getUrl(`System/Configuration/${name}`);

        return this.getJSON(url);
    }

    /**
     * Gets the server's scheduled tasks
     */
    public getScheduledTasks(options: UrlOptions = {}): any {
        const url = this.getUrl("ScheduledTasks", options);

        return this.getJSON(url);
    }

    /**
     * Starts a scheduled task
     */
    public startScheduledTask(id: string): any {
        snbn("id", id);

        const url = this.getUrl(`ScheduledTasks/Running/${id}`);

        return this.ajax({
            type: "POST",
            url
        });
    }

    /**
     * Gets a scheduled task
     */
    public getScheduledTask(id: string): Promise<any> {
        snbn("id", id);

        const url = this.getUrl(`ScheduledTasks/${id}`);

        return this.getJSON(url);
    }

    public getNextUpEpisodes(options?: UrlOptions): Promise<any> {
        const url = this.getUrl("Shows/NextUp", options);

        return this.getJSON(url);
    }

    /**
     * Stops a scheduled task
     */
    public stopScheduledTask(id: string): Promise<any> {
        snbn("id", id);

        const url = this.getUrl(`ScheduledTasks/Running/${id}`);

        return this.ajax({
            type: "DELETE",
            url
        });
    }

    /**
     * Gets the configuration of a plugin
     */
    public getPluginConfiguration(id: string): Promise<any> {
        snbn("id", id);

        const url = this.getUrl(`Plugins/${id}/Configuration`);

        return this.getJSON(url);
    }

    /**
     * Gets a list of plugins that are available to be installed
     */
    public getAvailablePlugins(options: UrlOptions = {}): Promise<any> {
        options.PackageType = "UserInstalled";

        const url = this.getUrl("Packages", options);

        return this.getJSON(url);
    }

    /**
     * Uninstalls a plugin
     */
    public uninstallPlugin(id: string): Promise<any> {
        snbn("id", id);

        const url = this.getUrl(`Plugins/${id}`);

        return this.ajax({
            type: "DELETE",
            url
        });
    }

    /**
     * Removes a virtual folder
     */
    public removeVirtualFolder(name: string, refreshLibrary?: boolean): Promise<any> {
        snbn("name", name);

        let url = "Library/VirtualFolders";

        url = this.getUrl(url, {
            refreshLibrary: !!refreshLibrary,
            name
        });

        return this.ajax({
            type: "DELETE",
            url
        });
    }

    /**
     * Adds a virtual folder
     */
    public addVirtualFolder(name: string, type?: string, refreshLibrary?: boolean, libraryOptions?: any): Promise<any> {
        snbn("name", name);

        const options: UrlOptions = {};

        if (type) {
            options.collectionType = type;
        }

        options.refreshLibrary = !!refreshLibrary;
        options.name = name;

        let url = "Library/VirtualFolders";

        url = this.getUrl(url, options);

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify({
                LibraryOptions: libraryOptions
            }),
            contentType: "application/json"
        });
    }

    public updateVirtualFolderOptions(id: string, libraryOptions: any): Promise<any> {
        snbn("id", id);

        let url = "Library/VirtualFolders/LibraryOptions";

        url = this.getUrl(url);

        return this.ajax({
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
    public renameVirtualFolder(name: string, newName: string, refreshLibrary?: boolean): Promise<any> {
        snbn("name", name);
        snbn("newName", newName);

        let url = "Library/VirtualFolders/Name";

        url = this.getUrl(url, {
            refreshLibrary: !!refreshLibrary,
            newName,
            name
        });

        return this.ajax({
            type: "POST",
            url
        });
    }

    /**
     * Adds an additional mediaPath to an existing virtual folder
     */
    public addMediaPath(
        virtualFolderName: string,
        mediaPath: string,
        networkSharePath?: string,
        refreshLibrary?: boolean
    ): Promise<any> {
        snbn("virtualFolderName", virtualFolderName);
        snbn("mediaPath", mediaPath);

        let url = "Library/VirtualFolders/Paths";

        const pathInfo: UrlOptions = {
            Path: mediaPath
        };
        if (networkSharePath) {
            pathInfo.NetworkPath = networkSharePath;
        }

        url = this.getUrl(url, {
            refreshLibrary: !!refreshLibrary
        });

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify({
                Name: virtualFolderName,
                PathInfo: pathInfo
            }),
            contentType: "application/json"
        });
    }

    public updateMediaPath(virtualFolderName: string, pathInfo: string): Promise<any> {
        snbn("virtualFolderName", virtualFolderName);
        snbn("pathInfo", pathInfo);

        let url = "Library/VirtualFolders/Paths/Update";

        url = this.getUrl(url);

        return this.ajax({
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
    public removeMediaPath(virtualFolderName: string, mediaPath: string, refreshLibrary?: boolean): Promise<any> {
        snbn("virtualFolderName", virtualFolderName);
        snbn("mediaPath", mediaPath);

        let url = "Library/VirtualFolders/Paths";

        url = this.getUrl(url, {
            refreshLibrary: !!refreshLibrary,
            path: mediaPath,
            name: virtualFolderName
        });

        return this.ajax({
            type: "DELETE",
            url
        });
    }

    /**
     * Deletes a user
     */
    public deleteUser(id: string): Promise<any> {
        snbn("id", id);

        const url = this.getUrl(`Users/${id}`);

        return this.ajax({
            type: "DELETE",
            url
        });
    }

    /**
     * Deletes a user image
     */
    public deleteUserImage(userId: string, imageType: string, imageIndex?: string): Promise<any> {
        snbn("userId", userId);
        snbn("imageType", imageType);

        let url = this.getUrl(`Users/${userId}/Images/${imageType}`);

        if (imageIndex) {
            url += `/${imageIndex}`;
        }

        return this.ajax({
            type: "DELETE",
            url
        });
    }

    public deleteItemImage(itemId: string, imageType: string, imageIndex?: string): Promise<any> {
        snbn("itemId", itemId);
        snbn("imageType", imageType);
        snbn("imageIndex", imageIndex);

        let url = this.getUrl(`Items/${itemId}/Images/${imageType}`);

        if (imageIndex) {
            url += `/${imageIndex}`;
        }

        return this.ajax({
            type: "DELETE",
            url
        });
    }

    public deleteItem(itemId: string): Promise<any> {
        snbn("itemId", itemId);

        const url = this.getUrl(`Items/${itemId}`);

        return this.ajax({
            type: "DELETE",
            url
        });
    }

    public stopActiveEncodings(playSessionId: string): Promise<any> {
        snbn("playSessionId", playSessionId);

        const options: UrlOptions = {
            deviceId: this.deviceId()
        };

        if (playSessionId) {
            options.PlaySessionId = playSessionId;
        }

        const url = this.getUrl("Videos/ActiveEncodings", options);

        return this.ajax({
            type: "DELETE",
            url
        });
    }

    public reportCapabilities(options?: UrlOptions): Promise<any> {
        const url = this.getUrl("Sessions/Capabilities/Full");

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(options),
            contentType: "application/json"
        });
    }

    public updateItemImageIndex(itemId: string, imageType: string, imageIndex: string, newIndex: any): Promise<any> {
        snbn("itemId", itemId);
        snbn("imageType", imageType);
        snbn("imageIndex", imageIndex);

        const options = { newIndex };

        const url = this.getUrl(
            `Items/${itemId}/Images/${imageType}/${imageIndex}/Index`,
            options
        );

        return this.ajax({
            type: "POST",
            url
        });
    }

    public getItemImageInfos(itemId: string): Promise<any> {
        snbn("itemId", itemId);

        const url = this.getUrl(`Items/${itemId}/Images`);

        return this.getJSON(url);
    }

    public getCriticReviews(itemId: string, options?: UrlOptions): Promise<any> {
        snbn("itemId", itemId);

        const url = this.getUrl(`Items/${itemId}/CriticReviews`, options);

        return this.getJSON(url);
    }

    public getItemDownloadUrl(itemId: string): string {
        snbn("itemId", itemId);

        const url = `Items/${itemId}/Download`;

        return this.getUrl(url, {
            api_key: this.accessToken()
        });
    }

    public getSessions(options?: UrlOptions): Promise<any> {
        const url = this.getUrl("Sessions", options);

        return this.getJSON(url);
    }

    /**
     * Uploads a user image
     * @param {String} userId
     * @param {String} imageType The type of image to delete, based on the server-side ImageType enum.
     * @param {Object} file The file from the input element
     */
    public uploadUserImage(userId: string, imageType: string, file: File): Promise<any> {
        snbn("userId", userId);
        snbn("imageType", imageType);
        snbn("file", file);

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

                const url = this.getUrl(
                    `Users/${userId}/Images/${imageType}`
                );

                this
                    .ajax({
                        type: "POST",
                        url,
                        data,
                        contentType: `image/${file.name.substring(
                            file.name.lastIndexOf(".") + 1
                        )}`
                    })
                    .then(resolve, reject);
            };

            // Read in the image file as a data URL.
            reader.readAsDataURL(file);
        });
    }

    public uploadItemImage(itemId: string, imageType: string, file: File): Promise<any> {
        snbn("itemId", itemId);
        snbn("imageType", imageType);
        snbn("file", file);

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

                this
                    .ajax({
                        type: "POST",
                        url,
                        data,
                        contentType: `image/${file.name.substring(
                            file.name.lastIndexOf(".") + 1
                        )}`
                    })
                    .then(resolve, reject);
            };

            // Read in the image file as a data URL.
            reader.readAsDataURL(file);
        });
    }

    /**
     * Gets the list of installed plugins on the server
     */
    public getInstalledPlugins(): Promise<any> {
        const options: UrlOptions = {};

        const url = this.getUrl("Plugins", options);

        return this.getJSON(url);
    }

    /**
     * Gets a user by id
     */
    public getUser(id: string): Promise<any> {
        snbn("id", id);

        const url = this.getUrl(`Users/${id}`);

        return this.getJSON(url);
    }

    /**
     * Gets a studio
     */
    public getStudio(name: string, userId?: string): Promise<any> {
        snbn("name", name);

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
    public getGenre(name: string, userId?: string): Promise<any> {
        snbn("name", name);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl(`Genres/${this.encodeName(name)}`, options);

        return this.getJSON(url);
    }

    public getMusicGenre(name: string, userId?: string): Promise<any> {
        snbn("name", name);

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
    public getArtist(name: string, userId?: string): Promise<any> {
        snbn("name", name);

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
    public getPerson(name: string, userId?: string): Promise<any> {
        snbn("name", name);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl(`Persons/${this.encodeName(name)}`, options);

        return this.getJSON(url);
    }

    public getPublicUsers(): Promise<any> {
        const url = this.getUrl("users/public");

        return this.ajax(
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
    public getUsers(options?: UrlOptions): Promise<any> {
        const url = this.getUrl("users", options || {});

        return this.getJSON(url);
    }

    /**
     * Gets all available parental ratings from the server
     */
    public getParentalRatings(): Promise<any> {
        const url = this.getUrl("Localization/ParentalRatings");

        return this.getJSON(url);
    }

    public getDefaultImageQuality(imageType?: string): number {
        return imageType?.toLowerCase() === "backdrop" ? 80 : 90;
    }

    /**
     * Constructs a url for a user image
     *
     * Options supports the following properties:
     * width - download the image at a fixed width
     * height - download the image at a fixed height
     * maxWidth - download the image at a maxWidth
     * maxHeight - download the image at a maxHeight
     * quality - A scale of 0-100. This should almost always be omitted as the default will suffice.
     * For best results do not specify both width and height together, as aspect ratio might be altered.
     */
    public getUserImageUrl(userId: string, options?: UrlOptions): string {
        snbn("userId", userId);

        options = options || {};

        let url = `Users/${userId}/Images/${options.type}`;

        if (options.index != null) {
            url += `/${options.index}`;
        }

        this.normalizeImageOptions(options);

        // Don't put these on the query string
        delete options.type;
        delete options.index;

        return this.getUrl(url, options);
    }

    /**
     * Constructs a url for an item image
     *
     * Options supports the following properties:
     * type - Primary, logo, backdrop, etc. See the server-side enum ImageType
     * index - When downloading a backdrop, use this to specify which one (omitting is equivalent to zero)
     * width - download the image at a fixed width
     * height - download the image at a fixed height
     * maxWidth - download the image at a maxWidth
     * maxHeight - download the image at a maxHeight
     * quality - A scale of 0-100. This should almost always be omitted as the default will suffice.
     * For best results do not specify both width and height together, as aspect ratio might be altered.
     */
    public getImageUrl(itemId: string, options?: UrlOptions): string {
        snbn("itemId", itemId);

        options = options || {};

        let url = `Items/${itemId}/Images/${options.type}`;

        if (options.index != null) {
            url += `/${options.index}`;
        }

        options.quality =
            options.quality || this.getDefaultImageQuality(options.type as string | undefined);

        if (this.normalizeImageOptions) {
            this.normalizeImageOptions(options);
        }

        // Don't put these on the query string
        delete options.type;
        delete options.index;

        return this.getUrl(url, options);
    }

    public getScaledImageUrl(itemId: string, options?: UrlOptions): string {
        snbn("itemId", itemId);

        options = options || {};

        let url = `Items/${itemId}/Images/${options.type}`;

        if (options.index != null) {
            url += `/${options.index}`;
        }

        this.normalizeImageOptions(options);

        // Don't put these on the query string
        delete options.type;
        delete options.index;
        delete options.minScale;

        return this.getUrl(url, options);
    }

    public getThumbImageUrl(item: any, options?: UrlOptions): string | null {
        snbn("item", item);

        options = options || {};

        options.imageType = "thumb";

        if (item.ImageTags && item.ImageTags.Thumb) {
            options.tag = item.ImageTags.Thumb;
            return this.getImageUrl(item.Id, options);
        } else if (item.ParentThumbItemId) {
            options.tag = item.ImageTags.ParentThumbImageTag;
            return this.getImageUrl(item.ParentThumbItemId, options);
        } else {
            return null;
        }
    }

    /**
     * Updates a user's password
     */
    public updateUserPassword(
        userId: string,
        currentPassword: string,
        newPassword: string
    ): Promise<any> {
        snbn("userId", userId);
        snbn("currentPassword", currentPassword);
        snbn("newPassword", newPassword);

        const url = this.getUrl(`Users/${userId}/Password`);

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify({
                CurrentPw: currentPassword || "",
                NewPw: newPassword
            }),
            contentType: "application/json"
        });
    }

    /**
     * Updates a user's easy password
     * @param {String} userId
     * @param {String} newPassword
     */
    public updateEasyPassword(userId: string, newPassword: string) {
        snbn("userId", userId);
        snbn("newPassword", newPassword);

        const url = this.getUrl(`Users/${userId}/EasyPassword`);

        return this.ajax({
            type: "POST",
            url,
            data: {
                NewPw: newPassword
            }
        });
    }

    /**
     * Resets a user's password
     * @param {String} userId
     */
    public resetUserPassword(userId: string): Promise<any> {
        snbn("userId", userId);

        const url = this.getUrl(`Users/${userId}/Password`);

        const postData: any = {};

        postData.resetPassword = true;

        return this.ajax({
            type: "POST",
            url,
            data: postData
        });
    }

    public resetEasyPassword(userId: string): Promise<any> {
        snbn("userId", userId);

        const url = this.getUrl(`Users/${userId}/EasyPassword`);

        const postData: any = {};

        postData.resetPassword = true;

        return this.ajax({
            type: "POST",
            url,
            data: postData
        });
    }

    /**
     * Updates the server's configuration
     * @param {Object} configuration
     */
    public updateServerConfiguration(configuration: any): Promise<any> {
        snbn("configuration", configuration);

        const url = this.getUrl("System/Configuration");

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(configuration),
            contentType: "application/json"
        });
    }

    public updateNamedConfiguration(name: string, configuration: any): Promise<any> {
        snbn("name", name);
        snbn("configuration", configuration);

        const url = this.getUrl(`System/Configuration/${name}`);

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(configuration),
            contentType: "application/json"
        });
    }

    public updateItem(item: any): Promise<any> {
        snbn("item", item);

        const url = this.getUrl(`Items/${item.Id}`);

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(item),
            contentType: "application/json"
        });
    }

    /**
     * Updates plugin security info
     */
    public updatePluginSecurityInfo(info: any): Promise<any> {
        snbn("info", info);

        const url = this.getUrl("Plugins/SecurityInfo");

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(info),
            contentType: "application/json"
        });
    }

    /**
     * Creates a user
     */
    public createUser(user: any): Promise<any> {
        snbn("user", user);

        const url = this.getUrl("Users/New");
        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(user),
            contentType: "application/json"
        });
    }

    /**
     * Updates a user
     */
    public updateUser(user: any): Promise<any> {
        snbn("user", user);

        const url = this.getUrl(`Users/${user.Id}`);

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(user),
            contentType: "application/json"
        });
    }

    public updateUserPolicy(userId: string, policy: any): Promise<any> {
        snbn("userId", userId);
        snbn("policy", policy);

        const url = this.getUrl(`Users/${userId}/Policy`);

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(policy),
            contentType: "application/json"
        });
    }

    public updateUserConfiguration(userId: string, configuration: any): Promise<any> {
        snbn("userId", userId);
        snbn("configuration", configuration);

        const url = this.getUrl(`Users/${userId}/Configuration`);

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(configuration),
            contentType: "application/json"
        });
    }

    /**
     * Updates the Triggers for a ScheduledTask
     */
    public updateScheduledTaskTriggers(id: string, triggers: any): Promise<any> {
        snbn("id", id);
        snbn("triggers", triggers);

        const url = this.getUrl(`ScheduledTasks/${id}/Triggers`);

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(triggers),
            contentType: "application/json"
        });
    }

    /**
     * Updates a plugin's configuration
     */
    public updatePluginConfiguration(id: string, configuration: any): Promise<any> {
        snbn("id", id);
        snbn("configuration", configuration);

        const url = this.getUrl(`Plugins/${id}/Configuration`);

        return this.ajax({
            type: "POST",
            url,
            data: JSON.stringify(configuration),
            contentType: "application/json"
        });
    }

    public getAncestorItems(itemId: string, userId?: string): Promise<any> {
        snbn("itemId", itemId);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        const url = this.getUrl(`Items/${itemId}/Ancestors`, options);

        return this.getJSON(url);
    }

    /**
     * Gets items based on a query, typically for children of a folder
     *
     * Options accepts the following properties:
     * itemId - Localize the search to a specific folder (root if omitted)
     * startIndex - Use for paging
     * limit - Use to limit results to a certain number of items
     * filter - Specify one or more ItemFilters, comma delimeted (see server-side enum)
     * sortBy - Specify an ItemSortBy (comma-delimeted list see server-side enum)
     * sortOrder - ascending/descending
     * fields - additional fields to include aside from basic info. This is a comma delimited list. See server-side enum ItemFields.
     * index - the name of the dynamic, localized index function
     * dynamicSortBy - the name of the dynamic localized sort function
     * recursive - Whether or not the query should be recursive
     * searchTerm - search term to use as a filter
     */
    public getItems(userId: string, options?: UrlOptions): Promise<any> {
        snbn("userId", userId);

        let url;

        if ((typeof userId).toString().toLowerCase() === "string") {
            url = this.getUrl(`Users/${userId}/Items`, options);
        } else {
            url = this.getUrl("Items", options);
        }

        return this.getJSON(url);
    }

    public getResumableItems(userId: string, options?: UrlOptions): Promise<any> {
        snbn("userId", userId);

        if (this.isMinServerVersion("3.2.33")) {
            return this.getJSON(
                this.getUrl(`Users/${userId}/Items/Resume`, options)
            );
        }

        return this.getItems(
            userId,
            Object.assign(
                {
                    SortBy: "DatePlayed",
                    SortOrder: "Descending",
                    Filters: "IsResumable",
                    Recursive: true,
                    CollapseBoxSetItems: false,
                    ExcludeLocationTypes: "Virtual"
                },
                options
            )
        );
    }

    public getMovieRecommendations(options?: UrlOptions): Promise<any> {
        return this.getJSON(this.getUrl("Movies/Recommendations", options));
    }

    public getUpcomingEpisodes(options?: UrlOptions): Promise<any> {
        return this.getJSON(this.getUrl("Shows/Upcoming", options));
    }

    public getUserViews(options: UrlOptions = {}, userId: string): Promise<any> {
        snbn("userId", userId);

        const url = this.getUrl(
            `Users/${userId || this.getCurrentUserId()}/Views`,
            options
        );

        return this.getJSON(url);
    }

    /**
     * Gets artists from an item
     */
    public getArtists(userId: string, options?: UrlOptions): Promise<any> {
        snbn("userId", userId);

        options = options || {};
        options.userId = userId;

        const url = this.getUrl("Artists", options);

        return this.getJSON(url);
    }

    /**
     * Gets artists from an item
     */
    public getAlbumArtists(userId: string, options?: UrlOptions): Promise<any> {
        snbn("userId", userId);

        options = options || {};
        options.userId = userId;

        const url = this.getUrl("Artists/AlbumArtists", options);

        return this.getJSON(url);
    }

    /**
     * Gets genres from an item
     */
    public getGenres(userId: string, options?: UrlOptions): Promise<any> {
        snbn("userId", userId);

        options = options || {};
        options.userId = userId;

        const url = this.getUrl("Genres", options);

        return this.getJSON(url);
    }

    public getMusicGenres(userId: string, options?: UrlOptions): Promise<any> {
        snbn("userId", userId);

        options = options || {};
        options.userId = userId;

        const url = this.getUrl("MusicGenres", options);

        return this.getJSON(url);
    }

    /**
     * Gets people from an item
     */
    public getPeople(userId: string, options?: UrlOptions): Promise<any> {
        snbn("userId", userId);

        options = options || {};
        options.userId = userId;

        const url = this.getUrl("Persons", options);

        return this.getJSON(url);
    }

    /**
     * Gets studios from an item
     */
    public getStudios(userId: string, options?: UrlOptions): Promise<any> {
        snbn("userId", userId);

        options = options || {};
        options.userId = userId;

        const url = this.getUrl("Studios", options);

        return this.getJSON(url);
    }

    /**
     * Gets local trailers for an item
     */
    public getLocalTrailers(userId: string, itemId: string): Promise<any> {
        snbn("userId", userId);
        snbn("itemId", itemId);

        const url = this.getUrl(
            `Users/${userId}/Items/${itemId}/LocalTrailers`
        );

        return this.getJSON(url);
    }

    public getAdditionalVideoParts(
        userId: Optional<string>,
        itemId: string
    ): Promise<any> {
        snbn("itemId", itemId);

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
        inherit: boolean
    ): Promise<any> {
        snbn("itemId", itemId);

        const options: UrlOptions = {};

        if (userId) {
            options.userId = userId;
        }

        options.InheritFromParent = inherit || false;

        const url = this.getUrl(`Items/${itemId}/ThemeMedia`, options);

        return this.getJSON(url);
    }

    public getSearchHints(options: UrlOptions): Promise<any> {
        const url = this.getUrl("Search/Hints", options);
        const serverId = this.serverId();

        return this.getJSON(url).then(result => {
            result.SearchHints.forEach((i: any) => {
                i.ServerId = serverId;
            });
            return result;
        });
    }

    /**
     * Gets special features for an item
     */
    public getSpecialFeatures(userId: string, itemId: string): Promise<any> {
        snbn("userId", userId);
        snbn("itemId", itemId);

        const url = this.getUrl(
            `Users/${userId}/Items/${itemId}/SpecialFeatures`
        );

        return this.getJSON(url);
    }

    public markPlayed(userId: string, itemId: string, date: Date): Promise<any> {
        snbn("userId", userId);
        snbn("itemId", itemId);

        const options: UrlOptions = {};

        if (date) {
            options.DatePlayed = getDateParamValue(date);
        }

        const url = this.getUrl(
            `Users/${userId}/PlayedItems/${itemId}`,
            options
        );

        return this.ajax({
            type: "POST",
            url,
            dataType: "json"
        });
    }

    public markUnplayed(userId: string, itemId: string): Promise<any> {
        snbn("userId", userId);
        snbn("itemId", itemId);

        const url = this.getUrl(`Users/${userId}/PlayedItems/${itemId}`);

        return this.ajax({
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
    ): Promise<any> {
        snbn("userId", userId);
        snbn("itemId", itemId);

        const url = this.getUrl(`Users/${userId}/FavoriteItems/${itemId}`);

        const method = isFavorite ? "POST" : "DELETE";

        return this.ajax({
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
    ): Promise<any> {
        snbn("userId", userId);
        snbn("itemId", itemId);

        const url = this.getUrl(`Users/${userId}/Items/${itemId}/Rating`, {
            likes
        });

        return this.ajax({
            type: "POST",
            url,
            dataType: "json"
        });
    }

    public getItemCounts(userId: string): Promise<any> {
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
    public clearUserItemRating(userId: string, itemId: string): Promise<any> {
        snbn("userId", userId);
        snbn("itemId", itemId);

        const url = this.getUrl(`Users/${userId}/Items/${itemId}/Rating`);

        return this.ajax({
            type: "DELETE",
            url,
            dataType: "json"
        });
    }

    /**
     * Reports the user has started playing something
     */
    public reportPlaybackStart(options: any): Promise<any> {
        snbn("options", options);

        this.lastPlaybackProgressReport = 0;
        this.lastPlaybackProgressReportTicks = null;
        stopBitrateDetection(this);

        const url = this.getUrl("Sessions/Playing");

        return this.ajax({
            type: "POST",
            data: JSON.stringify(options),
            contentType: "application/json",
            url
        });
    }

    /**
     * Reports progress viewing an item
     */
    public reportPlaybackProgress(options: any): Promise<any> {
        snbn("options", options);

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

        return this.ajax({
            type: "POST",
            data: JSON.stringify(options),
            contentType: "application/json",
            url
        });
    }

    public reportOfflineActions(actions: object): Promise<any> {
        snbn("actions", actions);

        const url = this.getUrl("Sync/OfflineActions");

        return this.ajax({
            type: "POST",
            data: JSON.stringify(actions),
            contentType: "application/json",
            url
        });
    }

    public syncData(data: object): Promise<any> {
        snbn("data", data);

        const url = this.getUrl("Sync/Data");

        return this.ajax({
            type: "POST",
            data: JSON.stringify(data),
            contentType: "application/json",
            url,
            dataType: "json"
        });
    }

    public getReadySyncItems(deviceId: string): Promise<any> {
        snbn("deviceId", deviceId);

        const url = this.getUrl("Sync/Items/Ready", {
            TargetId: deviceId
        });

        return this.getJSON(url);
    }

    public reportSyncJobItemTransferred(syncJobItemId: string): Promise<any> {
        snbn("syncJobItemId", syncJobItemId);

        const url = this.getUrl(`Sync/JobItems/${syncJobItemId}/Transferred`);

        return this.ajax({
            type: "POST",
            url
        });
    }

    public cancelSyncItems(itemIds: string[], targetId?: string): Promise<any> {
        snbn("itemIds", itemIds);

        const url = this.getUrl(`Sync/${targetId || this.deviceId()}/Items`, {
            ItemIds: itemIds.join(",")
        });

        return this.ajax({
            type: "DELETE",
            url
        });
    }

    /**
     * Reports a user has stopped playing an item
     */
    public reportPlaybackStopped(options: object): Promise<any> {
        snbn("options", options);

        this.lastPlaybackProgressReport = 0;
        this.lastPlaybackProgressReportTicks = null;
        redetectBitrate(this);

        const url = this.getUrl("Sessions/Playing/Stopped");

        return this.ajax({
            type: "POST",
            data: JSON.stringify(options),
            contentType: "application/json",
            url
        });
    }

    public sendPlayCommand(sessionId: string, options: Record<string, string>): Promise<any> {
        if (!sessionId) {
            throw new Error("null sessionId");
        }

        if (!options) {
            throw new Error("null options");
        }

        const url = this.getUrl(`Sessions/${sessionId}/Playing`, options);

        return this.ajax({
            type: "POST",
            url
        });
    }

    public sendCommand(sessionId: string, command: any): Promise<any> {
        if (!sessionId) {
            throw new Error("null sessionId");
        }

        if (!command) {
            throw new Error("null command");
        }

        const url = this.getUrl(`Sessions/${sessionId}/Command`);

        const ajaxOptions: Record<string, string> = {
            type: "POST",
            url
        };

        ajaxOptions.data = JSON.stringify(command);
        ajaxOptions.contentType = "application/json";

        return this.ajax(ajaxOptions);
    }

    public sendMessageCommand(
        sessionId: string,
        options: Record<string, string>
    ): Promise<any> {
        if (!sessionId) {
            throw new Error("null sessionId");
        }

        if (!options) {
            throw new Error("null options");
        }

        const url = this.getUrl(`Sessions/${sessionId}/Message`);

        const ajaxOptions: Record<string, string> = {
            type: "POST",
            url
        };

        ajaxOptions.data = JSON.stringify(options);
        ajaxOptions.contentType = "application/json";

        return this.ajax(ajaxOptions);
    }

    public sendPlayStateCommand(
        sessionId: string,
        command: string,
        options?: Record<string, string>
    ): Promise<any> {
        if (!sessionId) {
            throw new Error("null sessionId");
        }

        if (!command) {
            throw new Error("null command");
        }

        const url = this.getUrl(
            `Sessions/${sessionId}/Playing/${command}`,
            options || {}
        );

        return this.ajax({
            type: "POST",
            url
        });
    }

    public createPackageReview(review: any): Promise<any> {
        const url = this.getUrl(`Packages/Reviews/${review.id}`, review);

        return this.ajax({
            type: "POST",
            url
        });
    }

    public getPackageReviews(
        packageId: string,
        minRating: number,
        maxRating: number,
        limit: number
    ): Promise<any> {
        if (!packageId) {
            throw new Error("null packageId");
        }

        const options: any = {};

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

    public getSavedEndpointInfo(): any {
        return this._endPointInfo;
    }

    public getEndpointInfo(): Promise<any> {
        const savedValue = this._endPointInfo;
        if (savedValue) {
            return Promise.resolve(savedValue);
        }

        const instance = this;
        return this.getJSON(this.getUrl("System/Endpoint")).then(
            endPointInfo => {
                this.setSavedEndpointInfo(endPointInfo);
                return endPointInfo;
            }
        );
    }

    public getLatestItems(options: UrlOptions = {}): Promise<any> {
        return this.getJSON(
            this.getUrl(
                `Users/${this.getCurrentUserId()}/Items/Latest`,
                options
            )
        );
    }

    public getFilters(options?: UrlOptions): Promise<any> {
        return this.getJSON(this.getUrl("Items/Filters2", options));
    }

    public setSystemInfo(info: any) {
        this._serverVersion = info.Version;
    }

    public serverVersion(): string | undefined {
        return this._serverVersion;
    }

    public isMinServerVersion(version: string): boolean {
        const serverVersion = this.serverVersion();

        if (serverVersion) {
            return compareVersions(serverVersion, version) >= 0;
        }

        return false;
    }

    public handleMessageReceived(msg: MessageEvent) {
        this.onMessageReceivedInternal(msg);
    }

    private detectBitrateWithEndpointInfo(endpointInfo: any): Promise<number> {
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

    private setSavedEndpointInfo(info: any) {
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
                // Fixme: This is not correct
                accept: "application/json"

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

    private tryReconnect(retryCount?: number) {
        const rc = retryCount || 0;

        if (rc >= 20) {
            return Promise.reject();
        }

        return this.tryReconnectInternal().catch(err => {
            console.log(`error in tryReconnectInternal: ${err || ""}`);

            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    this.tryReconnect(rc + 1).then(resolve, reject);
                }, 500);
            });
        });
    }

    private getCachedUser(userId: string) {
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
        return (msg: MessageEvent) => {
            msg = JSON.parse(msg.data);
            this.onMessageReceivedInternal(msg);
        };
    }

    private messageIdsReceived: Record<number, boolean> = {};

    private onMessageReceivedInternal(msg: MessageEvent) {
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

    private normalizeReturnBitrate(bitrate?: number) {
        if (!bitrate) {
            if (this.lastDetectedBitrate) {
                return this.lastDetectedBitrate;
            }

            return Promise.reject();
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

    private getRemoteImagePrefix(options: any) {
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

    private normalizeImageOptions(options: UrlOptions) {
        let ratio = this._devicePixelRatio || 1;

        if (ratio) {
            if (options.minScale) {
                ratio = Math.max(options.minScale as number, ratio);
            }

            if (options.width) {
                options.width = Math.round(options.width as number * ratio);
            }
            if (options.height) {
                options.height = Math.round(options.height as number * ratio);
            }
            if (options.maxWidth) {
                options.maxWidth = Math.round(options.maxWidth as number * ratio);
            }
            if (options.maxHeight) {
                options.maxHeight = Math.round(options.maxHeight as number * ratio);
            }
        }

        options.quality =
            options.quality || this.getDefaultImageQuality(options.type as string | undefined);

        // Fixme: This called an "overridable" method on the client before
        if (this.normalizeImageOptions) {
            this.normalizeImageOptions(options);
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
