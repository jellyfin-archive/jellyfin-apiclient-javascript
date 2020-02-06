export interface QueryResult<T> {
    Items: T[];
    TotalRecordCount: number;
    StartIndex: number;
}
