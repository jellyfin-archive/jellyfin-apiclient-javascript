import ConnectionManager from "../connectionmanager";
import ServerSync from "./serversync";

export default class MultiServerSync {
    public async sync(connectionManager: ConnectionManager, options: unknown): Promise<void> {
        console.log("MultiServerSync.sync starting...");

        for (const server of connectionManager.getSavedServers()) {
            try {
                await new ServerSync().sync(connectionManager, server, options);
                console.log(`ServerSync succeeded to server: ${server.Id}`);
            } catch (err) {
                console.log(`ServerSync failed to server: ${server.Id}. ${err}`);
            }
        }
        
        console.log("MultiServerSync.sync complete");
    }
}