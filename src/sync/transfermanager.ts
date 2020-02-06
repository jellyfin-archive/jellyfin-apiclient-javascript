import { LocalItem } from "../types/LocalItem";

export interface DownloadResult {
    path: string;
    isComplete: boolean;
}

function downloadFile(url: string, folder: string, localItem: LocalItem, imageUrl: string): Promise<DownloadResult> {
    return Promise.reject();
}

function downloadSubtitles(url: string, path: string): Promise<DownloadResult> {
    return Promise.reject();
}

function downloadImage(url: string, path: string[]): Promise<DownloadResult> {
    return Promise.reject();
}

function resyncTransfers() {
    return Promise.resolve();
}

function getDownloadItemCount() {
    return Promise.resolve(0);
}

export default {
    downloadFile,
    downloadSubtitles,
    downloadImage,
    resyncTransfers,
    getDownloadItemCount,
    enableBackgroundCompletion: false,
    isDownloadFileInQueue: (path: string) => false
};