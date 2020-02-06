import { Optional } from "../../types";

export interface MediaAttachment {
    Codec: Optional<string>;
    CodecTag: Optional<string>;
    Comment: Optional<string>;
    Index: number;
    FileName: Optional<string>;
    MimeType: Optional<string>;
    DeliveryUrl: Optional<string>;
}
