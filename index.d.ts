interface IReq {
    uploadId: string;
    input: File;
}
interface IOption {
    partSize?: number;
    onError?: (ev: any) => void;
    onProgress?: (p: {
        [id: string]: number;
    }) => void;
    onSuccess?: (res: any[]) => void;
    parallel?: number;
    headers?: {
        [name: string]: string;
    };
}
export default class Uploader {
    private url;
    private progress;
    private opt;
    private res;
    private _xhrs;
    private _abortedFiles;
    constructor(url: string, opt?: IOption);
    getLoadedFile(): {
        [id: string]: number;
    };
    isLoaded(id: string, index: number): boolean;
    setLoadedFile(id: string, index: number): void;
    removeLoadedFile(id: string): void;
    abortAll(): void;
    abort(id: string): void;
    submit(files: IReq[]): void;
}