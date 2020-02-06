import { Optional } from "../../types";

export interface SendMessageCommand {
    Text: Optional<string>;
    Header: Optional<string>;
    Timeout?: Optional<number>;
}
