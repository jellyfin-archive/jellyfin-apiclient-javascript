import events from './events';
import appStorage from './appStorage';
import cookies from 'js-cookie';

function readSession(key, server) {
    const value = cookies.get(`${key}-${server.Id}`);

    if (value) {
        try {
            const { UserId, AccessToken } = JSON.parse(value);
            server.UserId = UserId || server.UserId;
            server.AccessToken = AccessToken || server.AccessToken;
        } catch (e) {
            console.error(e);
        }
    }
}

function saveSession(key, server) {
    cookies.set(`${key}-${server.Id}`, JSON.stringify({
        UserId: server.UserId,
        AccessToken: server.AccessToken
    }));
}

function removeSession(key) {
    const prefix = `${key}-`;

    for (const cookie in cookies.get()) {
        if (cookie.startsWith(prefix)) {
            cookies.remove(cookie);
        }
    }
}

function initialize(appStorage, key) {
    const json = appStorage.getItem(key) || '{}';

    console.log(`Stored JSON credentials: ${json}`);
    let credentials = JSON.parse(json);
    credentials.Servers = credentials.Servers || [];

    for (const server of credentials.Servers) {
        readSession(key, server);
    }

    return credentials;
}

function set(instance, data) {
    if (data) {
        instance._credentials = data;

        const dataCopy = JSON.parse(JSON.stringify(data));

        // Remove session data so we don't leave removed servers
        removeSession(instance.key);

        for (const server of dataCopy.Servers || []) {
            if (server.UserId && server.AccessToken) {
                saveSession(instance.key, server);
            } else {
                delete server.EnableAutoLogin;
            }

            if (!server.EnableAutoLogin) {
                delete server.UserId;
                delete server.AccessToken;
                delete server.EnableAutoLogin;
            }
        }

        instance.appStorage.setItem(instance.key, JSON.stringify(dataCopy));
    } else {
        instance.clear();
    }

    events.trigger(instance, 'credentialsupdated');
}

export default class Credentials {
    constructor(key) {
        this.key = key || 'jellyfin_credentials';
        this.appStorage = appStorage;
        this._credentials = initialize(this.appStorage, this.key);
    }

    clear() {
        removeSession(this.key);
        this._credentials = null;
        this.appStorage.removeItem(this.key);
    }

    credentials(data) {
        if (data) {
            set(this, data);
        }

        return this._credentials;
    }

    addOrUpdateServer(list, server) {
        if (!server.Id) {
            throw new Error('Server.Id cannot be null or empty');
        }

        const existing = list.filter(({ Id }) => Id === server.Id)[0];

        if (existing) {
            // Merge the data
            existing.DateLastAccessed = Math.max(existing.DateLastAccessed || 0, server.DateLastAccessed || 0);

            existing.UserLinkType = server.UserLinkType;

            if (server.AccessToken) {
                existing.AccessToken = server.AccessToken;
                existing.UserId = server.UserId;
                existing.EnableAutoLogin = server.EnableAutoLogin;
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
}
