import { ApiClient } from "./apiclient";
import { AppStorage } from "./appStorage";
import Credentials from "./credentials";
import events from "./events";
import {
    AuthenticationResult,
    BaseItemDto,
    ConnectionMode,
    ImageType,
    JsonRequestOptions,
    Optional,
    PostFullCapabilities,
    PublicSystemInfo,
    RequestOptions,
    ServerDiscoveryInfo,
    ServerInfo,
    SystemInfo,
    UserDto,
    WebSocketMessage
} from "./types";
import { assertNotNullish } from "./utils";

const defaultTimeout = 20000;

export interface LocalUser {
    Id?: Optional<string>;
    PrimaryImageTag?: Optional<string>;
    localUser: UserDto;
    name: Optional<string>;
    imageUrl: Optional<string>;
    supportsImageParams: boolean;
}

interface ServerAddress {
    url: string;
    mode: ConnectionMode;
    timeout: number;
}

interface ImageUrl {
    url: string | null;
    supportsParams: boolean;
}

interface ConnectOptions {
    enableAutoLogin?: boolean;
    updateDateLastAccessed?: boolean;
    enableAutomaticBitrateDetection?: boolean;
    reportCapabilities?: boolean;
    enableWebSocket?: boolean;
}

interface ConnectResult {
    Servers?: ServerInfo[];
    ApiClient?: ApiClient;
    State: ConnectState;
}

enum ConnectState {
    SignedIn = "SignedIn",
    ServerSignIn = "ServerSignIn",
    ServerSelection = "ServerSelection",
    Unavailable = "Unavailable",
    ServerUpdateNeeded = "ServerUpdateNeeded"
}

interface ReconnectState {
    numAddresses: number;
    rejects: number;
    resolved: boolean;
}

interface ReconnectResult {
    url: string;
    connectionMode: ConnectionMode;
    data: PublicSystemInfo;
}

function getServerAddress(server: ServerInfo, mode?: Optional<ConnectionMode>) {
    switch (mode) {
        case ConnectionMode.Local:
            return server.LocalAddress;
        case ConnectionMode.Manual:
            return server.ManualAddress;
        case ConnectionMode.Remote:
            return server.RemoteAddress;
        default:
            return (
                server.ManualAddress ||
                server.LocalAddress ||
                server.RemoteAddress
            );
    }
}

function paramsToString(params: Record<string, any>) {
    const values = [];

    for (const key in params) {
        if (!params.hasOwnProperty(key)) {
            continue;
        }

        const value = params[key];

        if (value !== null && value !== undefined && value !== "") {
            values.push(
                `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
            );
        }
    }
    return values.join("&");
}

function mergeServers(
    credentialProvider: Credentials,
    a: ServerInfo[],
    b: ServerInfo[]
) {
    for (let i = 0, length = b.length; i < length; i++) {
        credentialProvider.addOrUpdateServer(a, b[i]);
    }

    return a;
}

function updateServerInfo(server: ServerInfo, systemInfo: PublicSystemInfo) {
    server.Name = systemInfo.ServerName;

    if (systemInfo.Id) {
        server.Id = systemInfo.Id;
    }
    if (systemInfo.LocalAddress) {
        server.LocalAddress = systemInfo.LocalAddress;
    }
    // TODO: WanAddress was removed as we thought it wasn't used, leaving it for the moment till we find out the impact
    if ((systemInfo as any).WanAddress) {
        server.RemoteAddress = (systemInfo as any).WanAddress;
    }
}

function getEmbyServerUrl(baseUrl: string, handler: string) {
    return `${baseUrl}/emby/${handler}`;
}

function getFetchPromise(request: RequestOptions): Promise<Response> {
    const headers: Record<string, string> = request.headers || {};

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

function fetchWithTimeout(
    url: string,
    options: Optional<RequestInit>,
    timeoutMs: number
): Promise<Response> {
    console.log(`fetchWithTimeout: timeoutMs: ${timeoutMs}, url: ${url}`);

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(reject, timeoutMs);

        options = options || {};
        options.credentials = "same-origin";

        fetch(url, options).then(
            response => {
                clearTimeout(timeout);

                console.log(
                    `fetchWithTimeout: succeeded connecting to url: ${url}`
                );

                resolve(response);
            },
            _error => {
                clearTimeout(timeout);

                console.log(
                    `fetchWithTimeout: timed out connecting to url: ${url}`
                );

                reject();
            }
        );
    });
}

async function ajax<T = any>(request: JsonRequestOptions): Promise<T>;
async function ajax(request: RequestOptions): Promise<Response> {
    assertNotNullish("request", request);

    request.headers = request.headers || {};

    console.log(`ConnectionManager requesting url: ${request.url}`);

    try {
        const response = await getFetchPromise(request);
        console.log(
            `ConnectionManager response status: ${response.status}, url: ${request.url}`
        );

        if (response.status >= 400) {
            throw response;
        }

        if (
            request.dataType === "json" ||
            request.headers.accept === "application/json"
        ) {
            return response.json();
        }

        return response;
    } catch (err) {
        console.log(`ConnectionManager request failed to url: ${request.url}`);
        throw err;
    }
}

function replaceAll(
    originalString: string,
    strReplace: string,
    strWith: string
) {
    const reg = new RegExp(strReplace, "ig");
    return originalString.replace(reg, strWith);
}

function normalizeAddress(address: string) {
    // attempt to correct bad input
    address = address.trim();

    if (address.toLowerCase().indexOf("http") !== 0) {
        address = `http://${address}`;
    }

    // Seeing failures in iOS when protocol isn't lowercase
    address = replaceAll(address, "Http:", "http:");
    address = replaceAll(address, "Https:", "https:");

    return address;
}

function stringEqualsIgnoreCase(a: Optional<string>, b: Optional<string>) {
    return (a ?? "").toLowerCase() === (b ?? "").toLowerCase();
}

function compareVersions(a: string, b: string) {
    // -1 a is smaller
    // 1 a is larger
    // 0 equal
    const aParts = a.split(".");
    const bParts = b.split(".");

    for (
        let i = 0, length = Math.max(aParts.length, bParts.length);
        i < length;
        i++
    ) {
        const aVal = parseInt(aParts[i] || "0", 10);
        const bVal = parseInt(bParts[i] || "0", 10);

        if (aVal < bVal) {
            return -1;
        }

        if (aVal > bVal) {
            return 1;
        }
    }

    return 0;
}

export interface NativeShell {
    version: number;

    // AppHost: AppHost;
    // FileSystem?: FileSystem;

    enableFullscreen(): void;
    disableFullscreen(): void;

    getPlugins(): Promise<string[]>;
    findServers?(timeout: number): Promise<ServerDiscoveryInfo[]>;
    openUrl(url: string): void;
}

export default class ConnectionManager {
    public onLocalUserSignedIn?: Optional<(user: UserDto) => Promise<void>>;
    private _apiClients: ApiClient[] = [];
    private _minServerVersion = "3.2.33";
    private _appName: string;
    private _appVersion: string;
    private _capabilities: PostFullCapabilities;
    private _credentialProvider: Credentials;

    constructor(
        credentialProvider: Credentials,
        private appStorage: AppStorage,
        private apiClientFactory: typeof ApiClient,
        private serverDiscoveryFn: NativeShell,
        appName: string,
        appVersion: string,
        private deviceName: string,
        private deviceId: string,
        capabilities: PostFullCapabilities,
        private devicePixelRatio: number
    ) {
        console.log("Begin ConnectionManager constructor");

        this._appName = appName;
        this._appVersion = appVersion;
        this._capabilities = capabilities;
        this._credentialProvider = credentialProvider;
    }

    public appName = () => this._appName;
    public appVersion = () => this._appVersion;
    public capabilities = () => this._capabilities;
    public credentialProvider = () => this._credentialProvider;

    public getServerInfo(id: string) {
        const servers = this._credentialProvider.credentials().Servers;

        return servers.filter(s => s.Id === id)[0];
    }

    public getLastUsedServer() {
        const servers = this._credentialProvider.credentials().Servers;

        servers.sort(
            (a, b) => (b.DateLastAccessed || 0) - (a.DateLastAccessed || 0)
        );

        if (!servers.length) {
            return null;
        }

        return servers[0];
    }

    public addApiClient(apiClient: ApiClient) {
        this._apiClients.push(apiClient);

        const existingServers = this._credentialProvider
            .credentials()
            .Servers.filter(
                s =>
                    stringEqualsIgnoreCase(
                        s.ManualAddress,
                        apiClient.serverAddress()
                    ) ||
                    stringEqualsIgnoreCase(
                        s.LocalAddress,
                        apiClient.serverAddress()
                    ) ||
                    stringEqualsIgnoreCase(
                        s.RemoteAddress,
                        apiClient.serverAddress()
                    )
            );

        const existingServer = existingServers.length
            ? existingServers[0]
            : apiClient.serverInfo!;
        existingServer.DateLastAccessed = new Date().getTime();
        existingServer.LastConnectionMode = ConnectionMode.Manual;
        existingServer.ManualAddress = apiClient.serverAddress();

        if (apiClient.manualAddressOnly) {
            existingServer.manualAddressOnly = true;
        }

        apiClient.serverInfo = existingServer;

        apiClient.onAuthenticated = (instance, result) =>
            this.onAuthenticated(instance, result, {}, true);

        if (!existingServers.length) {
            const credentials = this._credentialProvider.credentials();
            credentials.Servers = [existingServer];
            this._credentialProvider.credentials(credentials);
        }

        events.trigger(this, "apiclientcreated", [apiClient]);
    }

    public clearData() {
        console.log("connection manager clearing data");

        const credentials = this._credentialProvider.credentials();
        credentials.Servers = [];
        this._credentialProvider.credentials(credentials);
    }

    public getOrCreateApiClient(serverId: string) {
        const credentials = this._credentialProvider.credentials();
        const servers = credentials.Servers.filter(s =>
            stringEqualsIgnoreCase(s.Id, serverId)
        );

        if (!servers.length) {
            throw new Error(`Server not found: ${serverId}`);
        }

        const server = servers[0];
        const serverAddress = getServerAddress(
            server,
            server.LastConnectionMode
        );

        if (!serverAddress) {
            throw new Error(`Could not get server address: ${server.Id}`);
        }

        return this._getOrAddApiClient(server, serverAddress);
    }

    public async user(apiClient: ApiClient): Promise<LocalUser | null> {
        if (apiClient && apiClient.getCurrentUserId()) {
            const user = await apiClient.getCurrentUser();
            const image = this.getImageUrl(user);

            return {
                localUser: user,
                name: user ? user.Name : null,
                imageUrl: image.url,
                supportsImageParams: image.supportsParams
            };
        }

        return null;
    }

    public async logout() {
        console.log("begin connectionManager loguot");

        const promises = this._apiClients
            .filter(client => !!client.accessToken())
            .map(client => this.logoutOfServer(client));

        await Promise.all(promises);

        const credentials = this._credentialProvider.credentials();
        credentials.Servers.filter(u => u.UserLinkType !== "Guest").forEach(
            server => {
                server.UserId = null;
                server.AccessToken = null;
                server.ExchangeToken = null;
            }
        );
    }

    public getSavedServers(): ServerInfo[] {
        const credentials = this._credentialProvider.credentials();

        return credentials.Servers.slice(0).sort(
            (a, b) => (b.DateLastAccessed || 0) - (a.DateLastAccessed || 0)
        );
    }

    public async getAvailableServers(): Promise<ServerInfo[]> {
        console.log("Begin getAvailableServers");

        // Clone the array
        const credentials = this._credentialProvider.credentials();

        const foundServers = await this.findServers();
        const servers = credentials.Servers.slice(0);

        mergeServers(this._credentialProvider, servers, foundServers);
        servers.sort(
            (a, b) => (b.DateLastAccessed || 0) - (a.DateLastAccessed || 0)
        );
        credentials.Servers = servers;
        this._credentialProvider.credentials(credentials);

        return servers;
    }

    public async connectToServers(
        servers: ServerInfo[],
        options: ConnectOptions
    ): Promise<ConnectResult> {
        console.log(`Begin connectToServers, with ${servers.length} servers`);

        const firstServer = servers.length ? servers[0] : null;
        // See if we have any saved credentials and can auto sign in
        if (firstServer) {
            const result = await this.connectToServer(firstServer, options);
            if (result.State === ConnectState.Unavailable) {
                result.State = ConnectState.ServerSelection;
            }
            console.log(
                `resolving connectToServers with result.State: ${result.State}`
            );
            return result;
        }

        return {
            Servers: servers,
            State: ConnectState.ServerSelection
        };
    }

    public async connectToServer(
        server: ServerInfo,
        options?: ConnectOptions
    ): Promise<ConnectResult> {
        console.log("begin connectToServer");

        try {
            const result = await this.tryReconnect(server);
            const serverUrl = result.url;
            const connectionMode = result.connectionMode;
            const systemInfo = result.data;

            if (
                compareVersions(
                    this.minServerVersion(),
                    systemInfo.Version!
                ) === 1
            ) {
                console.log(
                    `minServerVersion requirement not met. Server version: ${systemInfo.Version}`
                );
                return {
                    State: ConnectState.ServerUpdateNeeded,
                    Servers: [server]
                };
            } else if (server.Id && systemInfo.Id !== server.Id) {
                console.log(
                    "http request succeeded, but found a different server Id than what was expected"
                );
                return {
                    State: ConnectState.Unavailable
                };
            }

            return new Promise(resolve =>
                this.onSuccessfulConnection(
                    server,
                    systemInfo,
                    connectionMode,
                    serverUrl,
                    true,
                    options,
                    resolve
                )
            );
        } catch (err) {
            return {
                State: ConnectState.Unavailable
            };
        }
    }

    public async connectToAddress(
        address: string,
        options?: ConnectOptions
    ): Promise<ConnectResult> {
        assertNotNullish("address", address);

        address = normalizeAddress(address);

        const server: ServerInfo = {
            ManualAddress: address,
            LastConnectionMode: ConnectionMode.Manual
        };

        try {
            return this.connectToServer(server, options);
        } catch (result) {
            console.log(`connectToAddress ${address} failed`);
            return {
                State: ConnectState.Unavailable
            };
        }
    }

    public async deleteServer(serverId: string): Promise<void> {
        assertNotNullish("serverId", serverId);

        const servers = this._credentialProvider
            .credentials()
            .Servers.filter(s => s.Id === serverId);
        const server = servers.length ? servers[0] : null;

        try {
            assertNotNullish("server", server);

            if (!server.ConnectServerId) {
                const credentials = this._credentialProvider.credentials();

                credentials.Servers = credentials.Servers.filter(
                    s => s.Id !== serverId
                );

                this._credentialProvider.credentials(credentials);
            }
        } catch (err) {
            console.warn(`Error deleting server ${serverId}: ${err}`);
        }
    }

    public async connect(options: ConnectOptions): Promise<ConnectResult> {
        console.log("Begin connect");

        const servers = await this.getAvailableServers();
        return this.connectToServers(servers, options);
    }

    public handleMessageReceived(msg: WebSocketMessage<any>) {
        const serverId = msg.ServerId;
        if (serverId) {
            const apiClient = this.getApiClient(serverId);
            if (apiClient) {
                if (typeof msg.Data === "string") {
                    try {
                        msg.Data = JSON.parse(msg.Data);
                    } catch (err) {
                        console.log(`unable to parse json content: ${err}`);
                    }
                }

                apiClient.handleMessageReceived(msg);
            }
        }
    }

    public getApiClients(): ApiClient[] {
        const servers = this.getSavedServers();

        for (let i = 0, length = servers.length; i < length; i++) {
            const server = servers[i];
            if (server.Id) {
                this._getOrAddApiClient(
                    server,
                    getServerAddress(server, server.LastConnectionMode)!
                );
            }
        }

        return this._apiClients;
    }

    public getApiClient(itemOrServerId: BaseItemDto | string): ApiClient {
        const serverId =
            typeof itemOrServerId === "string"
                ? itemOrServerId
                : itemOrServerId.ServerId;

        if (!serverId) {
            throw new Error("itemOrServerId cannot be null");
        }

        return this._apiClients.filter(a => {
            const serverInfo = a.serverInfo;

            // We have to keep this hack in here because of the addApiClient method
            return !serverInfo || serverInfo.Id === serverId;
        })[0];
    }

    public minServerVersion(val?: string): string {
        if (val) {
            this._minServerVersion = val;
        }

        return this._minServerVersion;
    }

    private _getOrAddApiClient(
        server: ServerInfo,
        serverUrl: string
    ): ApiClient {
        assertNotNullish("server.Id", server.Id);

        let apiClient = this.getApiClient(server.Id);

        if (!apiClient) {
            apiClient = new this.apiClientFactory(
                this.appStorage,
                serverUrl,
                this._appName,
                this._appVersion,
                this.deviceName,
                this.deviceId,
                this.devicePixelRatio
            );
            apiClient.serverInfo = server;
            apiClient.onAuthenticated = (instance, result) =>
                this.onAuthenticated(instance, result, {}, true);

            this._apiClients.push(apiClient);

            events.trigger(this, "apiclientcreated", [apiClient]);
        }

        console.log("returning instance from getOrAddApiClient");
        return apiClient;
    }

    private onAuthenticated(
        apiClient: ApiClient,
        result: AuthenticationResult,
        options: ConnectOptions,
        saveCredentials: boolean
    ) {
        const credentials = this._credentialProvider.credentials();
        const servers = credentials.Servers.filter(
            s => s.Id === result.ServerId
        );
        const server = servers.length ? servers[0] : apiClient.serverInfo;

        assertNotNullish("server", server);
        assertNotNullish("result.User", result.User);

        if (options.updateDateLastAccessed !== false) {
            server.DateLastAccessed = new Date().getTime();
        }

        server.Id = result.ServerId;

        if (saveCredentials) {
            server.UserId = result.User.Id;
            server.AccessToken = result.AccessToken;
        } else {
            server.UserId = null;
            server.AccessToken = null;
        }

        this._credentialProvider.addOrUpdateServer(credentials.Servers, server);
        this._credentialProvider.credentials(credentials);

        // set this now before updating server info, otherwise it won't be set in time
        apiClient.enableAutomaticBitrateDetection =
            options.enableAutomaticBitrateDetection;

        apiClient.serverInfo = server;
        this.afterConnected(apiClient, options);

        return this.onLocalUserSignIn(
            server,
            apiClient.serverAddress(),
            result.User
        );
    }

    private afterConnected(apiClient: ApiClient, options: ConnectOptions = {}) {
        if (options.reportCapabilities !== false) {
            apiClient.reportCapabilities(this.capabilities());
        }
        apiClient.enableAutomaticBitrateDetection = !!options.enableAutomaticBitrateDetection;

        if (options.enableWebSocket !== false) {
            console.log("calling apiClient.ensureWebSocket");

            apiClient.ensureWebSocket();
        }
    }

    private async onLocalUserSignIn(
        server: ServerInfo,
        serverUrl: string,
        user: UserDto
    ) {
        // Ensure this is created so that listeners of the event can get the apiClient instance
        this._getOrAddApiClient(server, serverUrl);

        // This allows the app to have a single hook that fires before any other
        if (this.onLocalUserSignedIn) {
            await this.onLocalUserSignedIn(user);
        }

        events.trigger(this, "localusersignedin", [user]);
    }

    private async validateAuthentication(
        server: ServerInfo,
        serverUrl: string
    ): Promise<void> {
        try {
            assertNotNullish("server.AccessToken", server.AccessToken);

            const systemInfo = await ajax<SystemInfo>({
                type: "GET",
                url: getEmbyServerUrl(serverUrl, "System/Info"),
                dataType: "json",
                headers: {
                    "X-MediaBrowser-Token": server.AccessToken
                }
            });

            updateServerInfo(server, systemInfo);
        } catch (e) {
            server.UserId = null;
            server.AccessToken = null;
        }
    }

    private getImageUrl(user: UserDto): ImageUrl {
        if (user && user.PrimaryImageTag) {
            const apiClient = this.getApiClient(user);

            const url = apiClient.getUserImageUrl(user.Id, {
                Tag: user.PrimaryImageTag,
                Type: ImageType.Primary
            });

            return {
                url,
                supportsParams: true
            };
        }

        return {
            url: null,
            supportsParams: false
        };
    }

    private async logoutOfServer(apiClient: ApiClient): Promise<void> {
        const serverInfo = apiClient.serverInfo || {};

        const logoutInfo = {
            serverId: serverInfo.Id
        };

        try {
            await apiClient.logout();
            events.trigger(this, "localusersignedout", [logoutInfo]);
        } catch (e) {
            events.trigger(this, "localusersignedout", [logoutInfo]);
        }
    }

    private async findServers(): Promise<ServerInfo[]> {
        if (!(this.serverDiscoveryFn && this.serverDiscoveryFn.findServers)) {
            return [];
        }

        try {
            const foundServers = await this.serverDiscoveryFn.findServers(1000);
            return foundServers.map(foundServer => ({
                Id: foundServer.Id,
                LocalAddress:
                    this.convertEndpointAddressToManualAddress(foundServer) ||
                    foundServer.Address,
                Name: foundServer.Name,
                LastConnectionMode: ConnectionMode.Local
            }));
        } catch (error) {
            return [];
        }
    }

    private convertEndpointAddressToManualAddress(
        info: ServerDiscoveryInfo
    ): string | null {
        if (info.Address && info.EndpointAddress) {
            let address = info.EndpointAddress.split(":")[0];

            // Determine the port, if any
            const parts = info.Address.split(":");
            if (parts.length > 1) {
                const portString = parts[parts.length - 1];

                if (!isNaN(parseInt(portString, 10))) {
                    address += `:${portString}`;
                }
            }

            return normalizeAddress(address);
        }

        return null;
    }

    private getTryConnectPromise(
        url: string,
        connectionMode: ConnectionMode,
        state: ReconnectState,
        resolve: (result: ReconnectResult) => void,
        reject: () => void
    ) {
        console.log(`getTryConnectPromise ${url}`);

        ajax<PublicSystemInfo>({
            url: getEmbyServerUrl(url, "system/info/public"),
            timeout: defaultTimeout,
            type: "GET",
            dataType: "json"
        }).then(
            result => {
                if (!state.resolved) {
                    state.resolved = true;

                    console.log(`Reconnect succeeded to ${url}`);
                    resolve({
                        url,
                        connectionMode,
                        data: result as PublicSystemInfo
                    });
                }
            },
            () => {
                console.log(`Reconnect failed to ${url}`);

                if (!state.resolved) {
                    state.rejects++;
                    if (state.rejects >= state.numAddresses) {
                        reject();
                    }
                }
            }
        );
    }

    private tryReconnect(serverInfo: ServerInfo): Promise<ReconnectResult> {
        const addresses: ServerAddress[] = [];
        const addressesStrings: string[] = [];

        // the timeouts are a small hack to try and ensure the remote address doesn't resolve first

        // manualAddressOnly is used for the local web app that always connects to a fixed address
        if (
            !serverInfo.manualAddressOnly &&
            serverInfo.LocalAddress &&
            addressesStrings.indexOf(serverInfo.LocalAddress) === -1
        ) {
            addresses.push({
                url: serverInfo.LocalAddress,
                mode: ConnectionMode.Local,
                timeout: 0
            });
            addressesStrings.push(addresses[addresses.length - 1].url);
        }
        if (
            serverInfo.ManualAddress &&
            addressesStrings.indexOf(serverInfo.ManualAddress) === -1
        ) {
            addresses.push({
                url: serverInfo.ManualAddress,
                mode: ConnectionMode.Manual,
                timeout: 100
            });
            addressesStrings.push(addresses[addresses.length - 1].url);
        }
        if (
            !serverInfo.manualAddressOnly &&
            serverInfo.RemoteAddress &&
            addressesStrings.indexOf(serverInfo.RemoteAddress) === -1
        ) {
            addresses.push({
                url: serverInfo.RemoteAddress,
                mode: ConnectionMode.Remote,
                timeout: 200
            });
            addressesStrings.push(addresses[addresses.length - 1].url);
        }

        console.log(`tryReconnect: ${addressesStrings.join("|")}`);

        return new Promise((resolve, reject) => {
            const state: ReconnectState = {
                numAddresses: addresses.length,
                rejects: 0,
                resolved: false
            };

            addresses.map(url => {
                setTimeout(() => {
                    if (!state.resolved) {
                        this.getTryConnectPromise(
                            url.url,
                            url.mode,
                            state,
                            resolve,
                            reject
                        );
                    }
                }, url.timeout);
            });
        });
    }

    private onSuccessfulConnection(
        server: ServerInfo,
        systemInfo: PublicSystemInfo,
        connectionMode: ConnectionMode,
        serverUrl: string,
        verifyLocalAuthentication: boolean,
        options: ConnectOptions = {},
        resolve: (result: ConnectResult) => any
    ) {
        const credentials = this._credentialProvider.credentials();
        if (options.enableAutoLogin === false) {
            server.UserId = null;
            server.AccessToken = null;
        } else if (verifyLocalAuthentication && server.AccessToken) {
            this.validateAuthentication(server, serverUrl).then(() => {
                this.onSuccessfulConnection(
                    server,
                    systemInfo,
                    connectionMode,
                    serverUrl,
                    false,
                    options,
                    resolve
                );
            });

            return;
        }

        updateServerInfo(server, systemInfo);

        server.LastConnectionMode = connectionMode;

        if (options.updateDateLastAccessed !== false) {
            server.DateLastAccessed = new Date().getTime();
        }
        this._credentialProvider.addOrUpdateServer(credentials.Servers, server);
        this._credentialProvider.credentials(credentials);

        const result: ConnectResult = {
            Servers: [server],
            ApiClient: this._getOrAddApiClient(server, serverUrl),
            State:
                server.AccessToken && options.enableAutoLogin !== false
                    ? ConnectState.SignedIn
                    : ConnectState.ServerSignIn
        };

        // there's no way this is nullish but typescript insisted..
        assertNotNullish("result.ApiClient", result.ApiClient);

        result.ApiClient.setSystemInfo(systemInfo);

        // set this now before updating server info, otherwise it won't be set in time
        result.ApiClient.enableAutomaticBitrateDetection =
            options.enableAutomaticBitrateDetection;

        result.ApiClient.updateServerInfo(server, serverUrl);

        const resolveActions = () => {
            resolve(result);

            events.trigger(this, "connected", [result]);
        };

        if (result.State === ConnectState.SignedIn) {
            this.afterConnected(result.ApiClient, options);

            result.ApiClient.getCurrentUser().then(user => {
                this.onLocalUserSignIn(server, serverUrl, user).then(
                    resolveActions,
                    resolveActions
                );
            }, resolveActions);
        } else {
            resolveActions();
        }
    }
}
