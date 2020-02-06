export interface RequestOptions {
    url: string;
    headers?: Record<string, string>;
    type?: string;
    contentType?: string;
    data?: any;
    dataType?: string;
    timeout?: number;
}

export type JsonRequestOptions = RequestOptions &
    ({ dataType: "json" } | { headers: { accept: "application/json" } });
export type TextRequestOptions = RequestOptions & { dataType: "text" };
