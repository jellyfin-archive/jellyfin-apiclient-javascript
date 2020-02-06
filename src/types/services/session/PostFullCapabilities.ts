import { ClientCapabilities } from "../../model/session/ClientCapabilities";

export interface PostFullCapabilities extends Partial<ClientCapabilities> {
    Id: string;
}
