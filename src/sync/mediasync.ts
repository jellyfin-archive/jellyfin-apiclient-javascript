import { SubtitleDeliveryMethod } from "../types/models/dlna/SubtitleDeliveryMethod";
import { MediaStreamType } from "../types/models/entities/MediaStreamType";
import { MediaProtocol } from "../types/models/mediainfo/MediaProtocol";
import { ApiClient } from "../apiclient";
import localassetmanager, { LocalAssetManager } from "../localassetmanager";
import { Optional } from "../types/types";
import { ServerInfo } from "../types/ServerInfo";
import { ImageType } from "../types/models/entities/ImageType";
import { MediaStream } from "../types/models/entities/MediaStream";
import { LocalItem } from "../types/LocalItem";
import { SyncStatus } from "../types/SyncStatus";
import { JobItem } from "../types/JobItem";
import { BaseItemDto } from "../types/models/dto/BaseItemDto";
import { assertNotNullish } from "../utils";

export interface SyncDataResult {
    ItemIdsToRemove: string[];
}

function processDownloadStatus(apiClient: ApiClient, serverInfo: ServerInfo) {
    console.log("[mediasync] Begin processDownloadStatus");

    return localassetmanager.resyncTransfers().then(() => localassetmanager.getServerItems(serverInfo.Id).then(items => {

        console.log("[mediasync] Begin processDownloadStatus getServerItems completed");

        let p = Promise.resolve();
        let cnt = 0;

        // Debugging only
        // items.forEach(function (item) {
        //    p = p.then(function () {
        //        return localassetmanager.removeLocalItem(item);
        //    });
        // });

        // return Promise.resolve();

        const progressItems = items.filter(item => item.SyncStatus === "transferring" || item.SyncStatus === "queued");

        progressItems.forEach(item => {
            p = p.then(() => reportTransfer(apiClient, item));
            cnt++;
        });

        return p.then(() => {
            console.log(`[mediasync] Exit processDownloadStatus. Items reported: ${cnt.toString()}`);
            return Promise.resolve();
        });
    }));
}

function reportTransfer(apiClient: ApiClient, item) {

    return localassetmanager.getItemFileSize(item.LocalPath).then(size => {
        // The background transfer service on Windows leaves the file empty (size = 0) until it 
        // has been downloaded completely
        if (size > 0) {
            return apiClient.reportSyncJobItemTransferred(item.SyncJobItemId).then(() => {
                item.SyncStatus = "synced";
                return localassetmanager.addOrUpdateLocalItem(item);
            }, error => {
                console.error("[mediasync] Mediasync error on reportSyncJobItemTransferred", error);
                item.SyncStatus = "error";
                return localassetmanager.addOrUpdateLocalItem(item);
            });
        } else {
            return localassetmanager.isDownloadFileInQueue(item.LocalPath).then(result => {
                if (result) {
                    // just wait for completion
                    return Promise.resolve();
                }

                console.log("[mediasync] reportTransfer: Size is 0 and download no longer in queue. Deleting item.");
                return localassetmanager.removeLocalItem(item).then(() => {
                    console.log("[mediasync] reportTransfer: Item deleted.");
                    return Promise.resolve();
                }, err2 => {
                    console.log("[mediasync] reportTransfer: Failed to delete item.", err2);
                    return Promise.resolve();
                });
            });
        }

    }, error => {

        console.error("[mediasync] reportTransfer: error on getItemFileSize. Deleting item.", error);
        return localassetmanager.removeLocalItem(item).then(() => {
            console.log("[mediasync] reportTransfer: Item deleted.");
            return Promise.resolve();
        }, err2 => {
            console.log("[mediasync] reportTransfer: Failed to delete item.", err2);
            return Promise.resolve();
        });
    });
}

function reportOfflineActions(apiClient: ApiClient, serverInfo: ServerInfo) {
    console.log("[mediasync] Begin reportOfflineActions");

    return localassetmanager.getUserActions(serverInfo.Id).then(actions => {
        if (!actions.length) {
            console.log("[mediasync] Exit reportOfflineActions (no actions)");
            return Promise.resolve();
        }

        return apiClient.reportOfflineActions(actions).then(() => localassetmanager.deleteUserActions(actions).then(() => {
            console.log("[mediasync] Exit reportOfflineActions (actions reported and deleted.)");
            return Promise.resolve();
        }), err => {

            // delete those actions even on failure, because if the error is caused by 
            // the action data itself, this could otherwise lead to a situation that 
            // never gets resolved
            console.error(`[mediasync] error on apiClient.reportOfflineActions: ${err.toString()}`);
            return localassetmanager.deleteUserActions(actions);
        });
    });
}

function syncData(apiClient: ApiClient, serverInfo: ServerInfo) {
    console.log("[mediasync] Begin syncData");

    return localassetmanager.getServerItems(serverInfo.Id).then(items => {

        const completedItems = items.filter(item => (item) && ((item.SyncStatus === "synced") || (item.SyncStatus === "error")));

        const request = {
            TargetId: apiClient.deviceId(),
            LocalItemIds: completedItems.map(xitem => xitem.ItemId)
        };

        return apiClient.syncData(request).then(result => afterSyncData(apiClient, serverInfo, result).then(() => {
            console.log("[mediasync] Exit syncData");
            return Promise.resolve();
        }, err => {
            console.error(`[mediasync] Error in syncData: ${err.toString()}`);
            return Promise.resolve();
        }));
    });
}

function afterSyncData(apiClient: ApiClient, serverInfo: ServerInfo, syncDataResult: SyncDataResult) {
    console.log("[mediasync] Begin afterSyncData");

    let p = Promise.resolve();

    if (syncDataResult.ItemIdsToRemove && syncDataResult.ItemIdsToRemove.length > 0) {

        syncDataResult.ItemIdsToRemove.forEach(itemId => {
            p = p.then(() => removeLocalItem(itemId, serverInfo.Id));
        });
    }

    p = p.then(() => removeObsoleteContainerItems(serverInfo.Id));

    return p.then(() => {
        console.log("[mediasync] Exit afterSyncData");
        return Promise.resolve();
    });
}

function removeObsoleteContainerItems(serverId: string) {
    console.log("[mediasync] Begin removeObsoleteContainerItems");

    return localassetmanager.removeObsoleteContainerItems(serverId);
}

async function removeLocalItem(itemId: string, serverId: string) {
    console.log("[mediasync] Begin removeLocalItem");

    const item = await localassetmanager.getLocalItem(serverId, itemId);

    if (item) {
        return localassetmanager.removeLocalItem(item);
    }
}

function getNewMedia(apiClient: ApiClient, downloadCount: number) {
    console.log("[mediasync] Begin getNewMedia");

    return apiClient.getReadySyncItems(apiClient.deviceId()).then(jobItems => {
        let p = Promise.resolve();

        const maxDownloads = 10;
        let currentCount = downloadCount;

        jobItems.forEach(jobItem => {
            if (currentCount++ <= maxDownloads) {
                p = p.then(() => getNewItem(jobItem, apiClient));
            }
        });

        return p.then(() => {
            console.log("[mediasync] Exit getNewMedia");
            return Promise.resolve();
        });
    });
}

async function afterMediaDownloaded(apiClient: ApiClient, jobItem: JobItem, localItem: LocalItem) {
    assertNotNullish("jobItem.Item", jobItem.Item);

    console.log("[mediasync] Begin afterMediaDownloaded");

    await getImages(apiClient, jobItem, localItem);

    const libraryItem = jobItem.Item;

    await downloadParentItems(apiClient, jobItem, libraryItem);
    return getSubtitles(apiClient, jobItem, localItem);
}

function createLocalItem(libraryItem: BaseItemDto, jobItem?: Optional<JobItem>): LocalItem {
    assertNotNullish("libraryItem.Id", libraryItem.Id);
    assertNotNullish("libraryItem.ServerId", libraryItem.ServerId);

    console.log("[localassetmanager] Begin createLocalItem");

    const item: LocalItem = {
        Item: libraryItem,
        ItemId: libraryItem.Id,
        ServerId: libraryItem.ServerId,
        Id: libraryItem.Id
    };

    if (jobItem) {
        item.SyncJobItemId = jobItem.SyncJobItemId;
    }

    console.log("[localassetmanager] End createLocalItem");
    return item;
}

async function getNewItem(jobItem: JobItem, apiClient: ApiClient) {
    console.log("[mediasync] Begin getNewItem");

    const libraryItem = jobItem.Item;

    assertNotNullish("libraryItem", libraryItem);
    assertNotNullish("libraryItem.Id", libraryItem.Id);
    assertNotNullish("libraryItem.ServerId", libraryItem.ServerId);

    const existingItem = await localassetmanager.getLocalItem(libraryItem.ServerId, libraryItem.Id);

    if (existingItem) {
        switch (existingItem.SyncStatus) {
            case SyncStatus.Queued:
            case SyncStatus.Transferring:
            case SyncStatus.Synced:
                console.log("[mediasync] getNewItem: getLocalItem found existing item");

                if (localassetmanager.enableBackgroundCompletion()) {
                    return afterMediaDownloaded(apiClient, jobItem, existingItem);
                }
                break;
        }
    }

    libraryItem.CanDelete = false;
    libraryItem.CanDownload = false;
    libraryItem.SupportsSync = false;
    libraryItem.People = [];
    libraryItem.Chapters = [];
    libraryItem.Studios = [];
    libraryItem.SpecialFeatureCount = null;
    libraryItem.LocalTrailerCount = null;
    libraryItem.RemoteTrailers = [];

    const localItem = createLocalItem(libraryItem, jobItem);
    localItem.SyncStatus = SyncStatus.Queued;

    return downloadMedia(apiClient, jobItem, localItem);
}

async function downloadParentItems(apiClient: ApiClient, jobItem: JobItem, libraryItem: BaseItemDto) {
    if (libraryItem.SeriesId) {
        await downloadItem(apiClient, libraryItem.SeriesId);
    }

    if (libraryItem.SeasonId) {
        const seasonItem = await downloadItem(apiClient, libraryItem.SeasonId);
        libraryItem.SeasonPrimaryImageTag = (seasonItem.Item.ImageTags || {}).Primary;
    }

    if (libraryItem.AlbumId) {
        await downloadItem(apiClient, libraryItem.AlbumId);
    }
}

async function downloadItem(apiClient: ApiClient, itemId: string): Promise<LocalItem | null> {
    const downloadedItem = await apiClient.getItem(apiClient.getCurrentUserId(), itemId);
    
    downloadedItem.CanDelete = false;
    downloadedItem.CanDownload = false;
    downloadedItem.SupportsSync = false;
    downloadedItem.People = [];
    downloadedItem.SpecialFeatureCount = null;
    downloadedItem.BackdropImageTags = null;
    downloadedItem.ParentBackdropImageTags = null;
    downloadedItem.ParentArtImageTag = null;
    downloadedItem.ParentLogoImageTag = null;

    const localItem = createLocalItem(downloadedItem, null);

    try {
        return localassetmanager.addOrUpdateLocalItem(localItem);
    } catch (err) {
        console.error(`[mediasync] downloadItem failed: ${err.toString()}`);
    }

    return null;
}

function ensureLocalPathParts(localItem: LocalItem, jobItem: JobItem) {
    if (localItem.LocalPathParts) {
        return;
    }

    const libraryItem = localItem.Item;

    localItem.LocalPathParts = [
        ...localassetmanager.getDirectoryPath(libraryItem),
        localassetmanager.getLocalFileName(libraryItem, jobItem.OriginalFileName)
    ];
}

async function downloadMedia(apiClient: ApiClient, jobItem: JobItem, localItem: LocalItem) {
    const url = apiClient.getUrl(`Sync/JobItems/${jobItem.SyncJobItemId}/File`, {
        api_key: apiClient.accessToken()
    });

    ensureLocalPathParts(localItem, jobItem);

    try {
        const result = await localassetmanager.downloadFile(url, localItem);
        console.log("[mediasync] downloadMedia: localassetmanager.downloadFile returned.");

        const localPath = result.path;
        const libraryItem = localItem.Item;

        if (localPath) {
            if (libraryItem.MediaSources) {
                for (const mediaSource of libraryItem.MediaSources) {
                    mediaSource.Path = localPath;
                    mediaSource.Protocol = MediaProtocol.File;
                }
            }
        }

        localItem.LocalPath = localPath;
        
        try {
            await afterMediaDownloaded(apiClient, jobItem, localItem);

            if (result.isComplete) {
                localItem.SyncStatus = SyncStatus.Synced;
                return reportTransfer(apiClient, localItem);
            }

            localItem.SyncStatus = SyncStatus.Transferring;

            return localassetmanager.addOrUpdateLocalItem(localItem);
        } catch (err) {
            console.log(`[mediasync] downloadMedia: afterMediaDownloaded failed: ${err}`);
        }
    } catch (err) {
        console.log(`[mediasync] downloadMedia: localassetmanager.downloadFile failed: ${err}`);
    }

    return null;
}

async function getImages(apiClient: ApiClient, jobItem: Optional<JobItem>, localItem: LocalItem) {
    console.log("[mediasync] Begin getImages");

    const libraryItem = localItem.Item;
    const serverId = libraryItem.ServerId;

    assertNotNullish("serverId", serverId);

    // case 0
    const mainImageTag = (libraryItem.ImageTags || {}).Primary;

    if (libraryItem.Id && mainImageTag) {
        await downloadImage(localItem, apiClient, serverId, libraryItem.Id, mainImageTag, ImageType.Primary);
    }

    // case 0a
    const logoImageTag = (libraryItem.ImageTags || {}).Logo;
    if (libraryItem.Id && logoImageTag) {
        await downloadImage(localItem, apiClient, serverId, libraryItem.Id, logoImageTag, ImageType.Logo);
    }

    // case 0b
    const artImageTag = (libraryItem.ImageTags || {}).Art;
    if (libraryItem.Id && artImageTag) {
        await downloadImage(localItem, apiClient, serverId, libraryItem.Id, artImageTag, ImageType.Art);
    }

    // case 0c
    const bannerImageTag = (libraryItem.ImageTags || {}).Banner;
    if (libraryItem.Id && bannerImageTag) {
        await downloadImage(localItem, apiClient, serverId, libraryItem.Id, bannerImageTag, ImageType.Banner);
    }

    // case 0d
    const thumbImageTag = (libraryItem.ImageTags || {}).Thumb;
    if (libraryItem.Id && thumbImageTag) {
        await downloadImage(localItem, apiClient, serverId, libraryItem.Id, thumbImageTag, ImageType.Thumb);
    }

    // Backdrops
    // if (libraryItem.Id && libraryItem.BackdropImageTags) {
    //     for (let i = 0; i < libraryItem.BackdropImageTags.length; i++) {
    //         var backdropImageTag = libraryItem.BackdropImageTags[i];

    //         // use self-invoking function to simulate block-level variable scope
    //         (function (index, tag) {
    //            p = p.then(function () {
    //                return downloadImage(localItem, apiClient, serverId, libraryItem.Id, tag, 'backdrop', index);
    //            });
    //         })(i, backdropImageTag);
    //     }
    // }

    // case 1/2:
    if (libraryItem.SeriesId && libraryItem.SeriesPrimaryImageTag) {
        await downloadImage(localItem, apiClient, serverId, libraryItem.SeriesId, libraryItem.SeriesPrimaryImageTag, ImageType.Primary);
    }

    if (libraryItem.SeriesId && libraryItem.SeriesThumbImageTag) {
        await downloadImage(localItem, apiClient, serverId, libraryItem.SeriesId, libraryItem.SeriesThumbImageTag, ImageType.Thumb);
    }

    if (libraryItem.SeasonId && libraryItem.SeasonPrimaryImageTag) {
        await downloadImage(localItem, apiClient, serverId, libraryItem.SeasonId, libraryItem.SeasonPrimaryImageTag, ImageType.Primary);
    }

    // case 3:
    if (libraryItem.AlbumId && libraryItem.AlbumPrimaryImageTag) {
        await downloadImage(localItem, apiClient, serverId, libraryItem.AlbumId, libraryItem.AlbumPrimaryImageTag, ImageType.Primary);
    }

    if (libraryItem.ParentThumbItemId && libraryItem.ParentThumbImageTag) {
        await downloadImage(localItem, apiClient, serverId, libraryItem.ParentThumbItemId, libraryItem.ParentThumbImageTag, ImageType.Thumb);
    }

    if (libraryItem.ParentPrimaryImageItemId && libraryItem.ParentPrimaryImageTag) {
        await downloadImage(localItem, apiClient, serverId, libraryItem.ParentPrimaryImageItemId, libraryItem.ParentPrimaryImageTag, ImageType.Primary);
    }

    try {
        console.log("[mediasync] Finished getImages");
        return localassetmanager.addOrUpdateLocalItem(localItem);
    } catch (err) {
        console.log(`[mediasync] Error getImages: ${err.toString()}`);
    }

    return null;
}

async function downloadImage(localItem: LocalItem, apiClient: ApiClient, serverId: string, itemId: string, imageTag: string, imageType: ImageType, index: number = 0) {
    try {
        const hasImage = await localassetmanager.hasImage(serverId, itemId, imageType, index);

        if (hasImage) {
            console.log(`[mediasync] downloadImage - skip existing: ${itemId} ${imageType}_${index.toString()}`);
            return Promise.resolve();
        }

        const maxWidth = imageType === ImageType.Backdrop ? null : 400;

        const imageUrl = apiClient.getScaledImageUrl(itemId, {
            Tag: imageTag,
            Type: imageType,
            MaxWidth: maxWidth,
            api_key: apiClient.accessToken()
        });

        console.log(`[mediasync] downloadImage ${itemId} ${imageType}_${index.toString()}`);

        return localassetmanager.downloadImage(localItem, imageUrl, serverId, itemId, imageType, index);
    } catch (err) {
        console.log(`[mediasync] Error downloadImage: ${err.toString()}`);
    }

    return null;
}

async function getSubtitles(apiClient: ApiClient, jobItem: JobItem, localItem: LocalItem) {
    assertNotNullish("jobItem.Item", jobItem.Item);
    
    console.log("[mediasync] Begin getSubtitles");

    if (!jobItem.Item.MediaSources?.length) {
        console.log("[mediasync] Cannot download subtitles because video has no media source info.");
        return;
    }

    const files = jobItem.AdditionalFiles.filter(f => f.Type === "Subtitles");
    const mediaSource = jobItem.Item.MediaSources[0];

    for (const file of files) {
        await getItemSubtitle(file, apiClient, jobItem, localItem, mediaSource);
    }

    console.log("[mediasync] Exit getSubtitles");
}

async function getItemSubtitle(file: any, apiClient: ApiClient, jobItem: JobItem, localItem: LocalItem, mediaSource: { MediaStreams: MediaStream[] }) {
    console.log("[mediasync] Begin getItemSubtitle");

    const subtitleStream = mediaSource.MediaStreams.filter(m => m.Type === MediaStreamType.Subtitle && m.Index === file.Index)[0];

    if (!subtitleStream) {
        // We shouldn't get in here, but let's just be safe anyway
        console.log("[mediasync] Cannot download subtitles because matching stream info was not found.");
        return;
    }

    const url = apiClient.getUrl(`Sync/JobItems/${jobItem.SyncJobItemId}/AdditionalFiles`, {
        Name: file.Name,
        api_key: apiClient.accessToken()
    });

    const fileName = localassetmanager.getSubtitleSaveFileName(localItem, jobItem.OriginalFileName, subtitleStream.Language, subtitleStream.IsForced, subtitleStream.Codec);
    const subtitleResult = await localassetmanager.downloadSubtitles(url, fileName);

    if (localItem.AdditionalFiles) {
        localItem.AdditionalFiles.forEach(item => {
            if (item.Name === file.Name) {
                item.Path = subtitleResult.path;
            }
        });
    }

    subtitleStream.Path = subtitleResult.path;
    subtitleStream.DeliveryMethod = SubtitleDeliveryMethod.External;
    return localassetmanager.addOrUpdateLocalItem(localItem);
}

async function checkLocalFileExistence(apiClient: ApiClient, serverInfo: ServerInfo, options: any) {
    if (!options.checkFileExistence) {
        return;
    }

    console.log("[mediasync] Begin checkLocalFileExistence");

    const items = localassetmanager.getServerItems(serverInfo.Id);
    const completedItems = items.filter(item => (item) && ((item.SyncStatus === SyncStatus.Synced) || (item.SyncStatus === SyncStatus.Error)));

    for (const completedItem of completedItems) {
        const exists = await localassetmanager.fileExists(completedItem.LocalPath);
        
        if (!exists) {
            await localassetmanager.removeLocalItem(completedItem).catch();
        }
    }
}

export default class MediaSync {
    public async sync(apiClient: ApiClient, localassetmanager: LocalAssetManager, serverInfo: ServerInfo, options: any) {
        console.log("[mediasync]************************************* Start sync");

        try {
            await checkLocalFileExistence(apiClient, localassetmanager, serverInfo, options);
            await processDownloadStatus(apiClient, localassetmanager, serverInfo, options);
            const downloadCount = await localassetmanager.getDownloadItemCount();

            if (options.syncCheckProgressOnly === true && downloadCount > 2) {
                return;
            }

            await reportOfflineActions(apiClient, localassetmanager, serverInfo);
            await getNewMedia(apiClient, localassetmanager, options, downloadCount);
            await syncData(apiClient, localassetmanager, serverInfo);

            console.log("[mediasync]************************************* Exit sync");
        } catch (err) {
            console.error(err.toString());
        }
    }
}