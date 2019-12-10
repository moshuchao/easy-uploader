interface IReq {
    uploadId: string;
    input: File
}

interface IOption {
    partSize?: number;
    onError?: (ev: any) => void;
    onProgress?: (p: number[]) => void;
    onSuccess?: (res: any[]) => void;
    headers: {
        [name: string]: string,
    }
}

const noop = () => { }
const defaultOpt = {
    partSize: 1024 * Math.pow(2, 7),
    onError: noop,
    onProgress: noop,
    onSuccess: noop,
}

const SESSION_KEY = 'UPLOAD_FILE';

export default class Uploader {
    private url: string;
    private partSize: number;
    private onError: (err: any) => void;
    private onProgress: (p: number[]) => void;
    private onSuccess: (res: any[]) => void;
    private progress: number[] = [];
    private res: any[] = [];

    constructor(url: string, opt?: IOption) {
        this.url = url;
        const _opt = Object.assign({}, defaultOpt, opt);
        this.partSize = _opt.partSize;
        this.onError = _opt.onError;
        this.onProgress = _opt.onProgress;
        this.onSuccess = _opt.onSuccess;
    }

    getLoadedFile(): {
        [id: string]: number
    } {
        const loaded = sessionStorage.getItem(SESSION_KEY);
        return loaded ? JSON.parse(loaded) : {}
    }

    isLoaded(id: string, index: number) {
        return index <= this.getLoadedFile()[id]
    }

    setLoadedFile(id: string, index: number): void {
        const loaded = this.getLoadedFile();
        loaded[id] = index;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(loaded));
    }

    removeLoadedFile(id: string) {
        const loaded = this.getLoadedFile();
        delete loaded[id];
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(loaded));
    }

    submit(files: IReq[]) {
        const tasks = files.map((file, i) => {
            const n = Math.ceil(file.input.size / this.partSize);
            return new Array(n).fill(0).reduce((acc: (() => Promise<any>)[], _, j) => {
                if (this.isLoaded(file.uploadId, j)) {
                    return acc;
                }

                const p = () => new Promise<any>((resolve, reject) => {
                    const partFile = file.input.slice(j * this.partSize, (j + 1) * this.partSize);
                    const formData = new FormData();
                    formData.append('file', partFile);
                    const xhr = new XMLHttpRequest();
                    xhr.open('post', this.url);
                    xhr.setRequestHeader('X-File-Id', file.uploadId);
                    xhr.setRequestHeader('X-File-Name', file.input.name);
                    xhr.setRequestHeader('X-Chunk-Num', j + 1 + '');
                    xhr.setRequestHeader('X-Chunk-Total', n + '');
                    xhr.onload = (ev) => {
                        if (xhr.status === 200) {
                            this.setLoadedFile(file.uploadId, j);
                            this.onProgress(this.progress);
                            if (j + 1 === n) {
                                this.removeLoadedFile(file.uploadId);
                                this.res[i] = xhr.response;
                            }
                            return resolve();
                        }

                        return reject(xhr.response);
                    };
                    xhr.onerror = reject;
                    xhr.upload.onprogress = e => {
                        if (e.lengthComputable) {
                            this.progress[i] = +(e.loaded / e.total / n + j / n).toFixed(2);
                            if (j + 1 !== n) {
                                this.onProgress(this.progress);
                            }
                        }
                    };

                    xhr.send(formData);
                })

                acc.push(p);
                return acc;
            }, []);
        });

        const upload = () => {
            const promises = tasks.shift();
            if (!promises) {
                this.onSuccess(this.res);
                return;
            };

            const uploadPart = () => {
                const promise = promises.shift();
                if (!promise) return upload();
                promise()
                    .then(uploadPart) // next part
                    .catch(this.onError);
            }

            uploadPart();
        }

        upload();
    }
}