/**
 * Utility module for fetching remote content.
 * @module utils/fetch
 */
import events from '../events';

/**
 *
 * @param params
 * @returns {string}
 */
export function paramsToString(params) {
    // TODO: Replace with URLSearchParams (https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
    const values = [];

    for (const key in params) {
        const value = params[key];

        if (value !== null && value !== undefined && value !== '') {
            values.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
    }
    return values.join('&');
}

/**
 *
 * @param request
 * @returns {Promise<unknown>|*}
 */
export function getFetchPromise(request) {
    const headers = request.headers || {};

    if (request.dataType === 'json') {
        headers.accept = 'application/json';
    }

    const fetchRequest = {
        headers,
        method: request.type,
        credentials: 'same-origin'
    };

    let contentType = request.contentType;

    if (request.data) {
        if (typeof request.data === 'string') {
            fetchRequest.body = request.data;
        } else {
            fetchRequest.body = paramsToString(request.data);
            contentType = contentType || 'application/x-www-form-urlencoded; charset=UTF-8';
        }
    }

    if (contentType) {
        headers['Content-Type'] = contentType;
    }

    if (!request.timeout) {
        return fetch(request.url, fetchRequest);
    }

    return fetchWithTimeout(request.url, fetchRequest, request.timeout);
}

/**
 *
 * @param instance
 * @param url
 * @param response
 */
export function onFetchFail(instance, url, response) {
    events.trigger(instance, 'requestfail', [
        {
            url,
            status: response.status,
            errorCode: response.headers ? response.headers.get('X-Application-Error-Code') : null
        }]);
}

/**
 * Wraps around jQuery ajax methods to add additional info to the request.
 * @param request
 * @param includeAuthorization
 * @returns {*|Promise<T>}
 */
export function fetch(request, includeAuthorization) {
    if (!request) {
        throw new Error("Request cannot be null");
    }

    request.headers = request.headers || {};

    if (includeAuthorization !== false) {
        this.setRequestHeaders(request.headers);
    }

    if (this.enableAutomaticNetworking === false || request.type !== "GET") {
        console.log(`Requesting url without automatic networking: ${request.url}`);

        return getFetchPromise(request).then((response) => {
            this.lastFetch = new Date().getTime();

            if (response.status < 400) {
                if (request.dataType === 'json' || request.headers.accept === 'application/json') {
                    return response.json();
                } else if (request.dataType === 'text' || (response.headers.get('Content-Type') || '').toLowerCase().indexOf('text/') === 0) {
                    return response.text();
                } else {
                    return response;
                }
            } else {
                onFetchFail(this, request.url, response);
                return Promise.reject(response);
            }
        }).catch((error) => {
            onFetchFail(this, request.url, {});
            throw error;
        });
    }

    return this.fetchWithFailover(request, true);
}

/**
 *
 * @param url
 * @param options
 * @param timeoutMs
 * @returns {Promise<unknown>}
 */
export function fetchWithTimeout(url, options, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(reject, timeoutMs);

        options = options || {};
        options.credentials = 'same-origin';

        fetch(url, options).then((response) => {
            clearTimeout(timeout);
            resolve(response);
        }).catch((error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

export function getTryConnectPromise(instance, url, state, resolve, reject) {
    fetchWithTimeout(instance.getUrl('system/info/public', null, url), {
        method: 'GET',
        accept: 'application/json'
    }, 15000).then(() => {
        if (!state.resolved) {
            state.resolved = true;

            console.log("Reconnect succeeded to " + url);
            instance.serverAddress(url);
            resolve();
        }
    }).catch(() => {
        if (!state.resolved) {
            console.log("Reconnect failed to " + url);

            state.rejects++;
            if (state.rejects >= state.numAddresses) {
                reject();
            }
        }
    });
}

function tryReconnectInternal(instance) {
    const addresses = [];
    const addressesStrings = [];

    const serverInfo = instance.serverInfo();
    if (serverInfo.LocalAddress && addressesStrings.indexOf(serverInfo.LocalAddress) === -1) {
        addresses.push({ url: serverInfo.LocalAddress, timeout: 0 });
        addressesStrings.push(addresses[addresses.length - 1].url);
    }
    if (serverInfo.ManualAddress && addressesStrings.indexOf(serverInfo.ManualAddress) === -1) {
        addresses.push({ url: serverInfo.ManualAddress, timeout: 100 });
        addressesStrings.push(addresses[addresses.length - 1].url);
    }
    if (serverInfo.RemoteAddress && addressesStrings.indexOf(serverInfo.RemoteAddress) === -1) {
        addresses.push({ url: serverInfo.RemoteAddress, timeout: 200 });
        addressesStrings.push(addresses[addresses.length - 1].url);
    }

    console.log('tryReconnect: ' + addressesStrings.join('|'));

    return new Promise((resolve, reject) => {
        const state = {};
        state.numAddresses = addresses.length;
        state.rejects = 0;

        addresses.map((url) => {
            setTimeout(() => {
                if (!state.resolved) {
                    getTryConnectPromise(instance, url.url, state, resolve, reject);
                }
            }, url.timeout);
        });
    });
}

export function tryReconnect(instance, retryCount) {
    retryCount = retryCount || 0;

    if (retryCount >= 20) {
        return Promise.reject();
    }

    return tryReconnectInternal(instance).catch((err) => {
        console.log('error in tryReconnectInternal: ' + (err || ''));

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                tryReconnect(instance, retryCount + 1).then(resolve, reject);
            }, 500);
        });
    });
}
