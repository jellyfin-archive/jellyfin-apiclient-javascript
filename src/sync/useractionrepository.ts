// Database name
import { TBA1 } from "../types";

const dbName = "useractions";

// Database version
const dbVersion = 1;

let databaseInstance: IDBDatabase | undefined;

function getDb() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        if (databaseInstance) {
            resolve(databaseInstance);
            return;
        }

        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = event => {
            reject(event);
        };

        request.onupgradeneeded = function() {
            const db = this.result;

            // Create an objectStore to hold information about our customers. We're
            // going to use "ssn" as our key path because it's guaranteed to be
            // unique - or at least that's what I was told during the kickoff meeting.
            const objectStore = db.createObjectStore(dbName);

            // Use transaction oncomplete to make sure the objectStore creation is
            // finished before adding data into it.
            objectStore.transaction.oncomplete = () => {
                resolve((databaseInstance = db));
            };
        };

        request.onsuccess = function() {
            resolve((databaseInstance = this.result));
        };
    });
}

function getByServerId(serverId: string): Promise<TBA1[]> {
    return getAll().then(items =>
        items.filter(item => item.ServerId === serverId)
    );
}

function getAll(): Promise<TBA1[]> {
    return new Promise(async (resolve, reject) => {
        const db = await getDb();
        const storeName = dbName;

        const transaction = db.transaction([storeName], "readonly");
        const objectStore = transaction.objectStore(storeName);

        if ("getAll" in objectStore) {
            // IDBObjectStore.getAll() will return the full set of items in our store.
            const request = objectStore.getAll(null, 10000);

            request.onsuccess = function() {
                resolve(this.result);
            };

            request.onerror = reject;
        } else {
            // Fallback to the traditional cursor approach if getAll isn't supported.
            const results: TBA1[] = [];
            const request = (objectStore as IDBObjectStore).openCursor();

            request.onsuccess = function() {
                const cursor = this.result;
                if (cursor) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = reject;
        }
    });
}

// TODO: Narrow type
type Key = any;

function get(key: Key) {
    return new Promise(async (resolve, reject) => {
        const db = await getDb();
        const storeName = dbName;

        const transaction = db.transaction([storeName], "readonly");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.get(key);

        request.onerror = reject;

        request.onsuccess = event => {
            // Do something with the request.result!
            resolve(request.result);
        };
    });
}

function set(key: Key, val: TBA1) {
    return new Promise(async (resolve, reject) => {
        const db = await getDb();

        const storeName = dbName;

        const transaction = db.transaction([storeName], "readwrite");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.put(val, key);

        request.onerror = reject;
        request.onsuccess = resolve;
    });
}

function remove(key: Key) {
    return new Promise(async (resolve, reject) => {
        const db = await getDb();
        const storeName = dbName;

        const transaction = db.transaction([storeName], "readwrite");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.delete(key);

        request.onerror = reject;
        request.onsuccess = resolve;
    });
}

function clear() {
    return new Promise(async (resolve, reject) => {
        const db = await getDb();
        const storeName = dbName;

        const transaction = db.transaction([storeName], "readwrite");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.clear();

        request.onerror = reject;
        request.onsuccess = resolve;
    });
}

export default {
    get,
    set,
    remove,
    clear,
    getAll,
    getByServerId
};
