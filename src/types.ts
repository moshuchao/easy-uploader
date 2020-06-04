export type Dict<T> = {
    [x: string]: T
}

export type OptionsProps = {
    partSize: number;
    headers: Dict<string>;
    parallel: number;
}

export type FileMd5 = [File, string];

export type SuccessCallback = Dict<string>

export type ProgressCallback = Dict<number>

export type ErrorCallback = Error;

export type Res = {
    uploaded?: number[];
    url?: string;
}