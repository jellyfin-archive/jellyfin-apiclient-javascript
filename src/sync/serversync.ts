import ConnectionManager from "../connectionmanager";
import localAssetManager from "../localassetmanager";
import { ServerInfo } from "../types/ServerInfo";
import { assertNotNullish } from "../utils";
import MediaSync from "./mediasync";

function performSync(connectionManager: ConnectionManager, server: ServerInfo, options: unknown = {}) {
    console.log(`ServerSync.performSync to server: ${server.Id}`);

    // TODO: wtf? this looks like a mistake
    const promise = Promise.reject();

    return promise.then(() => syncMedia(connectionManager, server, options));
}

function syncMedia(connectionManager: ConnectionManager, server: ServerInfo, options: unknown) {
    assertNotNullish("server.Id", server.Id);

    const apiClient = connectionManager.getApiClient(server.Id);

    return new MediaSync().sync(apiClient, localAssetManager, server, options);
}

export default class ServerSync {
    public sync(connectionManager: ConnectionManager, server: ServerInfo, options: unknown) {
        if (!server.AccessToken && !server.ExchangeToken) {
            console.log(`Skipping sync to server ${server.Id} because there is no saved authentication information.`);
            return Promise.resolve();
        }

        const connectionOptions = {
            updateDateLastAccessed: false,
            enableWebSocket: false,
            reportCapabilities: false,
            enableAutomaticBitrateDetection: false
        };

        return connectionManager.connectToServer(server, connectionOptions).then(result => {
            if (result.State === "SignedIn") {
                return performSync(connectionManager, server, options);
            } else {
                console.log(`Unable to connect to server id: ${server.Id}`);
                return Promise.reject();
            }

        }, err => {
            console.log(`Unable to connect to server id: ${server.Id}`);
            throw err;
        });
    }
}
