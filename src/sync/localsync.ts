import ConnectionManager from "../connectionmanager";
import MultiServerSync from "./multiserversync";

let isSyncing = false;

export default {
    async sync(connectionManager: ConnectionManager, options) {
        console.log("localSync.sync starting...");

        if (isSyncing) {
            return Promise.resolve();
        }

        isSyncing = true;

        options = options || {};

        // TODO, get from appSettings
        options.cameraUploadServers = [];

        try {
            await new MultiServerSync().sync(connectionManager, options);
        } catch (err) {
            throw err;
        } finally {
            isSyncing = false;
        }
    }
};
