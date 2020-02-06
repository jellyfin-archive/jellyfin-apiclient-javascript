import { AppStorage } from "./appStorage";
import events from "./events";
import { ServerInfo } from "./types/ServerInfo";
import { Optional } from "./types/types";

export interface ServerCredentials {
    Servers: ServerInfo[];
}

export default class Credentials {
    private _credentials: ServerCredentials | null = null;

    constructor(
        public appStorage: AppStorage,
        public key: string = "jellyfin_credentials"
    ) {}

    public clear() {
        this._credentials = null;
        this.appStorage.removeItem(this.key);
    }

    public credentials(data?: Optional<ServerCredentials>) {
        if (data) {
            this.set(data);
        }

        this.ensure();
        return this._credentials!;
    }

    public addOrUpdateServer(list: ServerInfo[], server: ServerInfo) {
        if (!server.Id) {
            throw new Error("Server.Id cannot be null or empty");
        }

        const existing = list.filter(({ Id }) => Id === server.Id)[0];

        if (existing) {
            // Merge the data
            existing.DateLastAccessed = Math.max(
                existing.DateLastAccessed || 0,
                server.DateLastAccessed || 0
            );

            existing.UserLinkType = server.UserLinkType;

            if (server.AccessToken) {
                existing.AccessToken = server.AccessToken;
                existing.UserId = server.UserId;
            }
            if (server.ExchangeToken) {
                existing.ExchangeToken = server.ExchangeToken;
            }
            if (server.RemoteAddress) {
                existing.RemoteAddress = server.RemoteAddress;
            }
            if (server.ManualAddress) {
                existing.ManualAddress = server.ManualAddress;
            }
            if (server.LocalAddress) {
                existing.LocalAddress = server.LocalAddress;
            }
            if (server.Name) {
                existing.Name = server.Name;
            }
            if (server.LastConnectionMode != null) {
                existing.LastConnectionMode = server.LastConnectionMode;
            }
            if (server.ConnectServerId) {
                existing.ConnectServerId = server.ConnectServerId;
            }

            return existing;
        } else {
            list.push(server);
            return server;
        }
    }

    private ensure() {
        if (!this._credentials) {
            const json = this.appStorage.getItem(this.key) || "{}";

            console.log(`credentials initialized with: ${json}`);
            this._credentials = JSON.parse(json) as ServerCredentials;
            this._credentials.Servers = this._credentials.Servers || [];
        }
    }

    private set(data?: Optional<ServerCredentials>) {
        if (data) {
            this._credentials = data;
            this.appStorage.setItem(this.key, JSON.stringify(data));
        } else {
            this.clear();
        }

        events.trigger(this, "credentialsupdated");
    }
}
