declare module "uploader" {
    interface IReq {
        uploadId: string;
        input: File;
    }
    interface IOption {
        partSize?: number;
        onError?: (ev: any) => void;
        onProgress?: (p: number[]) => void;
        onSuccess?: (res: any[]) => void;
        headers: {
            [name: string]: string;
        };
    }
    export default class Uploader {
        private url;
        private partSize;
        private onError;
        private onProgress;
        private onSuccess;
        private progress;
        private res;
        constructor(url: string, opt?: IOption);
        submit(files: IReq[]): void;
    }
}
