import { Optional } from "../../types";

export interface CreateUserByName {
    Name: Optional<string>;
    Password?: Optional<string>;
}
