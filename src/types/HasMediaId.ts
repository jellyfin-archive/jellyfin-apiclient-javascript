/**
 * These are not used by the backend, but used in ApiClient.getRemoteImagePrefix
 * This is awful and should be refactored.
 *
 * @export
 * @interface HasMediaId
 */
export interface HasMediaId {
    artist?: string;
    person?: string;
    genre?: string;
    musicGenre?: string;
    studio?: string;
    itemId?: string;
}
