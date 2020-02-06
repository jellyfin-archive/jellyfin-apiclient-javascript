import { LocalItem } from "../types/LocalItem";

const dbVersion = 1;
const databases: Record<string, IDBDatabase> = {};

function createDB(dbName: string): Promise<IDBDatabase> {
    const request = indexedDB.open(dbName, dbVersion);

    return new Promise<IDBDatabase>((resolve, reject) => {
        request.onerror = event => reject(event);

        request.onupgradeneeded = event => {
            const db = (event.target as IDBRequest<IDBDatabase>).result;

            // Create an objectStore to hold information about our customers. We're
            // going to use "ssn" as our key path because it's guaranteed to be
            // unique - or at least that's what I was told during the kickoff meeting.
            const objectStore = db.createObjectStore(dbName);

            // Use transaction oncomplete to make sure the objectStore creation is
            // finished before adding data into it.
            objectStore.transaction.oncomplete = () => resolve(db);
        };

        request.onsuccess = () => resolve(request.result);
    });
}

function getDbName(serverId: string) {
    return `items_${serverId}`;
}

async function getDb(serverId: string) {
    const dbName = getDbName(serverId);
    const db = databases[dbName];
    if (db) {
        return db;
    }

    const newDB = await createDB(dbName);
    databases[dbName] = newDB;
    return newDB;
}

function filterDistinct<T>(value: T, index: number, self: T[]) {
    return self.indexOf(value) === index;
}

async function getServerItemTypes(serverId: string): Promise<string[]> {
    const all = await getAll(serverId);
    return all.map(item => item.Item.Type || "").filter(filterDistinct);
}

function getAll(serverId: string): Promise<LocalItem[]> {
    return new Promise<LocalItem[]>(async (resolve, reject) => {
        const db = await getDb(serverId);

        const storeName = getDbName(serverId);

        const transaction = db.transaction([storeName], "readonly");
        const objectStore = transaction.objectStore(storeName);

        if ("getAll" in objectStore) {
            // IDBObjectStore.getAll() will return the full set of items in our store.
            const request = objectStore.getAll(null, 10000);

            request.onsuccess = () => resolve(request.result);
            request.onerror = reject;
        } else {
            // Fallback to the traditional cursor approach if getAll isn't supported.
            const results: LocalItem[] = [];
            const request = (objectStore as IDBObjectStore).openCursor();

            request.onerror = reject;

            request.onsuccess = function() {
                const cursor = this.result;
                if (cursor) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
        }
    });
}

function get(serverId: string, key: IDBValidKey): Promise<LocalItem> {
    return new Promise(async (resolve, reject) => {
        const db = await getDb(serverId);

        const storeName = getDbName(serverId);

        const transaction = db.transaction([storeName], "readonly");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.get(key);

        request.onerror = reject;
        request.onsuccess = () => resolve(request.result);
    });
}

function set(serverId: string, key: IDBValidKey, val: LocalItem): Promise<LocalItem> {
    return new Promise(async (resolve, reject) => {
        const db = await getDb(serverId);

        const storeName = getDbName(serverId);

        const transaction = db.transaction([storeName], "readwrite");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.put(val, key);

        request.onerror = reject;
        request.onsuccess = () => resolve(val);
    });
}

function remove(serverId: string, key: IDBValidKey): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const db = await getDb(serverId);

        const storeName = getDbName(serverId);

        const transaction = db.transaction([storeName], "readwrite");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.delete(key);

        request.onerror = reject;
        request.onsuccess = () => resolve();
    });
}

function clear(serverId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const db = await getDb(serverId);

        const storeName = getDbName(serverId);

        const transaction = db.transaction([storeName], "readwrite");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.clear();

        request.onerror = reject;
        request.onsuccess = () => resolve();
    });
}

export default {
    get,
    set,
    remove,
    clear,
    getAll,
    getServerItemTypes
};
