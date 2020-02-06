import { ImageType } from "../../model/entities/ImageType";
import { Optional } from "../../types";

/**
 * Name is misleading, this is just the base of a image request.
 *
 * @export
 * @interface DeleteImageRequest
 */
export interface DeleteImageRequest {
    Type: ImageType;
    Index?: Optional<number>;
}
