import { BaseRefreshRequest } from "./BaseRefreshRequest";

export interface RefreshItem extends BaseRefreshRequest {
    Recursive?: boolean;
}
