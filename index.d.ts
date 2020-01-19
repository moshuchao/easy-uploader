// node_modules/.bin/tsc -p tsconfig.json
interface IReq {
    id: string;
    file: File;
}
interface IKV {
    [id: string]: number;
}
interface IOption {
    partSize?: number;
    onError?: (ev: any) => void;
    onProgress?: (p: IKV) => void;
    onSuccess?: (res: any[]) => void;
    parallel?: number;
    headers?: {
        [name: string]: string;
    };
}
interface IData {
    id: string;
    file: File;
    total: number;
    chunks: Blob[];
}
export default class Uploader {
    private url;
    private progress;
    private opt;
    private res;
    private _xhr;
    private _aborted;
    private _data;
    private _loadedChunk;
    constructor(url: string, opt?: IOption);
    isFinished(): boolean;
    abortAll(): void;
    abort(id: string): void;
    query(ids: string[], cb: () => void): void;
    uploadChunk(item: IData): void;
    startUpload(): void;
    submit(data: IReq[] | IReq): void;
}