/**
 * Utility module for bitrate detection
 * @module utils/bitrate
 */

export function stopBitrateDetection(instance) {
    if (instance.detectTimeout) {
        clearTimeout(instance.detectTimeout);
    }
}

function redetectBitrateInternal() {
    if (this.accessToken()) {
        this.detectBitrate();
    }
}

export function redetectBitrate(instance) {
    stopBitrateDetection(instance);

    if (instance.accessToken() && instance.enableAutomaticBitrateDetection !== false) {
        setTimeout(redetectBitrateInternal.bind(instance), 6000);
    }
}

export function normalizeReturnBitrate(instance, bitrate) {
    if (!bitrate) {
        if (instance.lastDetectedBitrate) {
            return instance.lastDetectedBitrate;
        }

        return Promise.reject();
    }

    let result = Math.round(bitrate * 0.7);

    // allow configuration of this
    if (instance.getMaxBandwidth) {
        const maxRate = instance.getMaxBandwidth();
        if (maxRate) {
            result = Math.min(result, maxRate);
        }
    }

    instance.lastDetectedBitrate = result;
    instance.lastDetectedBitrateTime = new Date().getTime();

    return result;
}

function detectBitrateInternal(instance, tests, index, currentBitrate) {
    if (index >= tests.length) {
        return normalizeReturnBitrate(instance, currentBitrate);
    }

    const test = tests[index];

    return instance.getDownloadSpeed(test.bytes).then(bitrate => {
        if (bitrate < test.threshold) {
            return normalizeReturnBitrate(instance, bitrate);
        } else {
            return detectBitrateInternal(instance, tests, index + 1, bitrate);
        }
    }).catch(() => normalizeReturnBitrate(instance, currentBitrate));
}

export function detectBitrateWithEndpointInfo(instance, endpointInfo) {
    if (endpointInfo.IsInNetwork) {
        const result = 140000000;
        instance.lastDetectedBitrate = result;
        instance.lastDetectedBitrateTime = new Date().getTime();
        return result;
    }

    return detectBitrateInternal(instance, [
        {
            bytes: 500000,
            threshold: 500000
        },
        {
            bytes: 1000000,
            threshold: 20000000
        },
        {
            bytes: 3000000,
            threshold: 50000000
        }], 0);
}
