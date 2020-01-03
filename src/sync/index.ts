import FileRepository from "./sync/filerepository";
import ItemRepository from "./sync/itemrepository";
import LocalSync from "./sync/localsync";
import MediaSync from "./sync/mediasync";
import MultiServerSync from "./sync/multiserversync";
import ServerSync from "./sync/serversync";
import TransferManager from "./sync/transfermanager";
import UserActionRepository from "./sync/useractionrepository";

export default {
    FileRepository,
    ItemRepository,
    LocalSync,
    MediaSync,
    MultiServerSync,
    ServerSync,
    TransferManager,
    UserActionRepository
}
