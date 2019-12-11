interface IReq {
    uploadId: string;
    input: File
}

interface IOption {
    partSize?: number;
    onError?: (ev: any) => void;
    onProgress?: (p: { [id: string]: number }) => void;
    onSuccess?: (res: any[]) => void;
    headers?: {
        [name: string]: string,
    }
}

const noop = () => { }
const defaultOpt = {
    partSize: 1024 * Math.pow(2, 7),
    onError: noop,
    onProgress: noop,
    onSuccess: noop,
    headers: {}
}

const SESSION_KEY = 'UPLOAD_FILE';


export default class Uploader {
    private url: string;
    private progress: { [id: string]: number } = {};
    private opt: {
        partSize: number;
        onError: (err: any) => void;
        onProgress: (p: { [id: string]: number }) => void;
        onSuccess: (res: any[]) => void;
        headers: { [propName: string]: string }
    }
    private res: any[] = [];

    private _xhrs: XMLHttpRequest[][] = []

    constructor(url: string, opt: IOption = {}) {
        this.url = url;
        this.opt = Object.assign({}, defaultOpt, opt);
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

    abort(index: number) {
        this._xhrs[index].forEach(xhr => {
            if (xhr.readyState > 0 && xhr.readyState < 4) {
                return xhr.abort();
            }
        })
    }

    submit(files: IReq[]) {
        const tasks = files.map((file, i) => {
            const n = Math.ceil(file.input.size / this.opt.partSize);
            this._xhrs[i] = [];
            return new Array(n).fill(0).reduce((acc: (() => Promise<any>)[], _, j) => {
                if (this.isLoaded(file.uploadId, j)) {
                    return acc;
                }

                const p = () => new Promise<any>((resolve, reject) => {
                    const partFile = file.input.slice(j * this.opt.partSize, (j + 1) * this.opt.partSize);
                    const formData = new FormData();
                    formData.append('file', partFile);
                    const xhr = new XMLHttpRequest();
                    xhr.open('post', this.url);
                    xhr.setRequestHeader('X-File-Id', file.uploadId);
                    xhr.setRequestHeader('X-File-Name', file.input.name);
                    xhr.setRequestHeader('X-Chunk-Num', j + 1 + '');
                    xhr.setRequestHeader('X-Chunk-Total', n + '');
                    for (const key in this.opt.headers) {
                        if (this.opt.headers.hasOwnProperty(key)) {
                            xhr.setRequestHeader(key, this.opt.headers[key]);
                        }
                    }
                    xhr.onload = (ev) => {
                        if (xhr.status === 200) {
                            this.setLoadedFile(file.uploadId, j);
                            this.opt.onProgress(this.progress);
                            if (j + 1 === n) {
                                this.removeLoadedFile(file.uploadId);
                                this.res[i] = xhr.response;
                            }
                            return resolve(ev);
                        }

                        return reject(xhr.response);
                    };

                    xhr.onabort = resolve;

                    xhr.onerror = reject;
                    xhr.upload.onprogress = e => {
                        if (e.lengthComputable) {
                            this.progress[file.uploadId] = +(e.loaded / e.total / n + j / n).toFixed(2);
                            if (j + 1 !== n) {
                                this.opt.onProgress(this.progress);
                            }
                        }
                    };

                    xhr.send(formData);
                    this._xhrs[i].push(xhr);
                })

                acc.push(p);
                return acc;
            }, []);
        });

        const upload = () => {
            const promises = tasks.shift();
            if (!promises) {
                this.opt.onSuccess(this.res.filter(content => content));
                return;
            };

            const uploadPart = () => {
                const promise = promises.shift();
                if (!promise) return upload();
                promise()
                    .then((ev: ProgressEvent) => {
                        if (ev.type === 'abort') {
                            return upload(); // next file
                        }
                        return uploadPart(); //next part
                    })
                    .catch(this.opt.onError);
            }

            uploadPart();
        }

        upload();
    }
}