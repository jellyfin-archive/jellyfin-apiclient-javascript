function onCachePutFail(e: Error) {
    console.log(e);
}

export interface AppStorage {
    setItem(name: string, value: string | null): void
    getItem(name: string): string | null
    removeItem(name: string): void
}

export default class BrowserStore implements AppStorage {
    private localData?: Record<string, string | null>;
    private cache?: Cache;

    constructor() {
        try {
            if (self.caches) {
                caches.open("embydata").then(this.onCacheOpened);
            }
        } catch (err) {
            console.log(`Error opening cache: ${err}`);
        }
    }

    public setItem(name: string, value: string) {
        localStorage.setItem(name, value);
        const localData = this.localData;
        if (localData) {
            const changed = localData[name] !== value;
            if (changed) {
                localData[name] = value;
                this.updateCache();
            }
        }
    }

    public getItem(name: string) {
        return localStorage.getItem(name);
    }

    public removeItem(name: string) {
        localStorage.removeItem(name);
        const localData = this.localData;
        if (localData) {
            localData[name] = null;
            delete localData[name];
            this.updateCache();
        }
    }

    private onCacheOpened(result: Cache) {
        this.cache = result;
        this.localData = {};
    }

    private updateCache() {
        if (this.cache) {
            this.cache.put("data", new Response(JSON.stringify(this.localData))).catch(onCachePutFail);
        }
    }
}
