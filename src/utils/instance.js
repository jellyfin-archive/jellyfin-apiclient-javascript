/**
 * Utility module for dealing with some instance operations
 * @module utils/instance
 */

export function setSavedEndpointInfo(instance, info) {
    instance._endPointInfo = info;
}

export function getCachedUser(instance, userId) {
    const serverId = instance.serverId();
    if (!serverId) {
        return null;
    }

    const json = instance.appStorage.getItem(`user-${userId}-${serverId}`);

    if (json) {
        return JSON.parse(json);
    }

    return null;
}

export function getRemoteImagePrefix(instance, options) {
    let urlPrefix;

    if (options.artist) {
        urlPrefix = `Artists/${instance.encodeName(options.artist)}`;
        delete options.artist;
    } else if (options.person) {
        urlPrefix = `Persons/${instance.encodeName(options.person)}`;
        delete options.person;
    } else if (options.genre) {
        urlPrefix = `Genres/${instance.encodeName(options.genre)}`;
        delete options.genre;
    } else if (options.musicGenre) {
        urlPrefix = `MusicGenres/${instance.encodeName(options.musicGenre)}`;
        delete options.musicGenre;
    } else if (options.studio) {
        urlPrefix = `Studios/${instance.encodeName(options.studio)}`;
        delete options.studio;
    } else {
        urlPrefix = `Items/${options.itemId}`;
        delete options.itemId;
    }

    return urlPrefix;
}

export function normalizeImageOptions(instance, options) {
    let ratio = instance._devicePixelRatio || 1;

    if (ratio) {
        if (options.minScale) {
            ratio = Math.max(options.minScale, ratio);
        }
        if (options.width) {
            options.width = Math.round(options.width * ratio);
        }
        if (options.height) {
            options.height = Math.round(options.height * ratio);
        }
        if (options.maxWidth) {
            options.maxWidth = Math.round(options.maxWidth * ratio);
        }
        if (options.maxHeight) {
            options.maxHeight = Math.round(options.maxHeight * ratio);
        }
    }

    options.quality = options.quality || instance.getDefaultImageQuality(options.type);

    if (instance.normalizeImageOptions) {
        instance.normalizeImageOptions(options);
    }
}