interface IReq {
    uploadId: string;
    input: File
}

interface IOption {
    partSize?: number;
    onError?: (ev: any) => void;
    onProgress?: (p: { [id: string]: number }) => void;
    onSuccess?: (res: any[]) => void;
    parallel?: number;
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
    headers: {},
    parallel: 1,
}

export default class Uploader {
    private url: string;
    private progress: { [id: string]: number } = {};
    private opt: {
        partSize: number;
        onError: (err: any) => void;
        onProgress: (p: { [id: string]: number }) => void;
        onSuccess: (res: any[]) => void;
        headers: { [propName: string]: string };
        parallel: number;
    }
    private res: any[] = [];

    private _xhrs: { [id: string]: XMLHttpRequest[] } = {}

    private _abortedFiles: string[] = []

    constructor(url: string, opt: IOption = {}) {
        this.url = url;
        this.opt = Object.assign({}, defaultOpt, opt);
    }

    abortAll() {
        for (let id in this._xhrs) {
            if (this._xhrs.hasOwnProperty(id)) {
                this.abort(id);
            }
        }
    }

    abort(id: string) {
        if (!this._xhrs[id]) {
            return console.warn('Can not abort xhr!');
        }

        this._abortedFiles.push(id);

        this._xhrs[id].forEach(xhr => {
            if (xhr.readyState > 0 && xhr.readyState < 4) {
                return xhr.abort();
            }
        });
    }

    query(ids: string[], cb: (ret: { [id: string]: number }) => void) {
        const xhr = new XMLHttpRequest();
        xhr.open('post', '/upload/query');
        xhr.setRequestHeader('content-type', 'application/json');
        xhr.onload = (ev) => {
            if (xhr.status === 200) {
                cb(JSON.parse(xhr.response));
            }

        };
        xhr.send(JSON.stringify({ ids }));
    }

    submit(files: IReq[]) {
        if (Object.keys(this._xhrs).length > 0) {
            return console.warn('Must be waiting upload finished!');
        }

        this.res = [];
        this.query(files.map(file => file.uploadId), (_loaded) => {
            const tasks = files.map((file, i) => {
                const n = Math.ceil(file.input.size / this.opt.partSize);
                this._xhrs[file.uploadId] = [];
                return new Array(n).fill(0).reduce((acc: (() => Promise<any>)[], _, j) => {
                    if (j + 1 <= _loaded[file.uploadId]) {
                        return acc;
                    }

                    const p = () => new Promise<any>((resolve, reject) => {
                        if (this._abortedFiles.indexOf(file.uploadId) > -1) {
                            return resolve({
                                type: 'abort',
                            });
                        }
                        const partFile = file.input.slice(j * this.opt.partSize, (j + 1) * this.opt.partSize);
                        const formData = new FormData();
                        formData.append('file', partFile);
                        const xhr = new XMLHttpRequest();
                        xhr.open('post', this.url);
                        xhr.setRequestHeader('X-File-Id', file.uploadId);
                        xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.input.name));
                        xhr.setRequestHeader('X-Chunk-Num', j + 1 + '');
                        xhr.setRequestHeader('X-Chunk-Total', n + '');
                        for (const key in this.opt.headers) {
                            if (this.opt.headers.hasOwnProperty(key)) {
                                xhr.setRequestHeader(key, encodeURIComponent(this.opt.headers[key]));
                            }
                        }
                        xhr.onload = (ev) => {
                            if (xhr.status === 200) {
                                this.opt.onProgress(this.progress);
                                if (j + 1 === n) {
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
                        this._xhrs[file.uploadId].push(xhr);
                    })

                    acc.push(p);
                    return acc;
                }, []);
            });

            const upload = () => {
                const promises = tasks.shift();
                if (!promises) {
                    const loadingFileIds = Object.keys(this._xhrs).filter((id) => this._abortedFiles.indexOf(id) < 0);
                    const finished = loadingFileIds.every(id => this._xhrs[id].every(xhr => xhr.readyState === 4));
                    if (finished) {
                        this.opt.onSuccess(this.res.filter(content => content));
                        this._xhrs = {};
                        this.progress = {};
                        this._abortedFiles = [];
                    }
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

            for (let i = 0, l = Math.min(this.opt.parallel, files.length); i < l; i++) {
                upload();
            }
        });
    }
}