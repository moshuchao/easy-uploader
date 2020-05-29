export type SubmitData = {
    id: string;
    file: File
}

export type SuccessCallback = {
    [md5: string]: string;
}

export type ProgressCallback = {
    [md5: string]: number;
}

export type Res = {
    uploaded?: number[];
    url?: string;
}

export type Listener<T> = (arg: T) => void;

export type EventCallbackMap = {
    progress: ProgressCallback;
    success: SuccessCallback;
}

export type Event = {
    [K in keyof EventCallbackMap]: Listener<EventCallbackMap[K]>[]
}
