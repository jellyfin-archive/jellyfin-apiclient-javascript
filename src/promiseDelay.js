/**
 * Creates a new delayed Promise instance.
 * @param {number} ms Delay in milliseconds.
 */
export default class PromiseDelay {
    constructor(ms) {
        this._fulfilled = false;
        this._promise = new Promise((resolve, reject) => {
            this._promiseResolve = resolve;
            this._promiseReject = reject;
            this.reset(ms);
        });
    }

    /**
     * Delayed promise.
     * @returns {Promise} A Promise fulfilled after timeout.
     */
    promise() {
        return this._promise;
    }

    /**
     * Resets delay.
     * @param {number} ms New delay in milliseconds.
     */
    reset(ms) {
        if (this._fulfilled) return;
        clearTimeout(this._timer);
        this._timer = setTimeout(() => this.resolve(), ms);
    }

    /**
     * Immediately resolves delayed Promise.
     */
    resolve() {
        if (this._fulfilled) return;
        clearTimeout(this._timer);
        this._fulfilled = true;
        this._promiseResolve();
    }

    /**
     * Immediately rejects delayed Promise.
     */
    reject() {
        if (this._fulfilled) return;
        clearTimeout(this._timer);
        this._fulfilled = true;
        this._promiseReject();
    }
}
