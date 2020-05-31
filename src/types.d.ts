export type Dict<T> = {
    [x: string]: T
}

export type OptionsProps = {
    partSize: number;
    headers: Dict<string>;
    parallel: number;
}

export type SubmitedData = [File, string]

export type SuccessCallback = Dict<string>

export type ProgressCallback = Dict<number>

export type ErrorCallback = Error;

export type Res = {
    uploaded?: number[];
    url?: string;
}

export type Listener<T> = (arg: T) => void;

export type EventCallbackMap = {
    progress: ProgressCallback;
    success: SuccessCallback;
    error: ErrorCallback
}

export type Event = {
    [K in keyof EventCallbackMap]: Listener<EventCallbackMap[K]>[]
}
