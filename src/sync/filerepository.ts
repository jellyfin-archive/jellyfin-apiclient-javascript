function getValidFileName(path: string) {
    // TODO
    return path;
}


function getFullLocalPath(pathArray: string[]) {
    // TODO
    return pathArray.join("/");
}

function getPathFromArray(pathArray: string[]) {
    // TODO
    return pathArray.join("/");
}

function deleteFile(path: string) {
    return Promise.resolve();
}

function deleteDirectory(path: string) {
    return Promise.resolve();
}

function fileExists(path: string) {
    return Promise.resolve(false);
}

function getItemFileSize(path: string) {
    return Promise.resolve(0);
}

function getImageUrl(pathParts: string[]) {
    return pathParts.join("/");
}

export default {
    getValidFileName,
    getFullLocalPath,
    getPathFromArray,
    deleteFile,
    deleteDirectory,
    fileExists,
    getItemFileSize,
    getImageUrl,
    getParentPath: (path: string) => "",
    combinePath: (folder: string, name: string) => "",
    getFullMetadataPath: (path: string[]) => ""
};
