import { Optional } from "../../types";

export interface WebSocketMessage<T = any> {
    MessageType: Optional<string>;
    MessageId: Optional<string>;
    ServerId: Optional<string>;
    Data: Optional<T>;
}
