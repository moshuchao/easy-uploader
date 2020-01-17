interface IReq {
    id: string;
    file: File
}

interface IKV {
    [id: string]: number
}
interface IOption {
    partSize?: number;
    onError?: (ev: any) => void;
    onProgress?: (p: IKV) => void;
    onSuccess?: (res: any[]) => void;
    parallel?: number;
    headers?: {
        [name: string]: string,
    }
}

interface IData {
    id: string;
    file: File;
    total: number;
    chunks: Blob[]
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
    private progress: IKV = {};
    private opt: {
        partSize: number;
        onError: (err: any) => void;
        onProgress: (p: IKV) => void;
        onSuccess: (res: any[]) => void;
        headers: { [propName: string]: string };
        parallel: number;
    }
    private res: any[] = [];

    private _xhr: { [id: string]: XMLHttpRequest } = {}

    private _aborted: string[] = []

    private _data: IData[] = []

    private _loadedChunk: IKV = {}


    constructor(url: string, opt: IOption = {}) {
        this.url = url;
        this.opt = Object.assign({}, defaultOpt, opt);
    }

    isFinished() {
        const ids = Object.keys(this.progress);
        return ids.every(id => this.progress[id] === 1);
    }


    abortAll() {
        this._data.forEach(item => {
            this.abort(item.id);
        });
    }

    abort(id: string) {
        this._aborted.push(id);

        if (this._xhr[id]) {
            this._xhr[id].abort();
        }
    }

    query(ids: string[], cb: () => void) {
        const xhr = new XMLHttpRequest();
        xhr.open('post', '/upload/query');
        xhr.setRequestHeader('content-type', 'application/json');
        xhr.onload = (ev) => {
            if (xhr.status === 200) {
                this._loadedChunk = JSON.parse(xhr.response);
                cb();
            }

        };
        xhr.send(JSON.stringify({ ids }));
    }

    uploadChunk(item: IData): void {
        const chunks = item.chunks;
        const chunk = chunks.shift();
        if (!chunk) return this.startUpload();
        const n = item.total - chunks.length;
        const id = item.id;
        if (n <= this._loadedChunk[id]) return this.uploadChunk(item);
        const t = item.total;
        const xhr = new XMLHttpRequest();
        xhr.open('post', this.url);
        xhr.setRequestHeader('X-File-Id', id);
        xhr.setRequestHeader('X-File-Name', encodeURIComponent(item.file.name));
        xhr.setRequestHeader('X-Chunk-Num', n + '');
        xhr.setRequestHeader('X-Chunk-Total', item.total + '');
        for (const key in this.opt.headers) {
            if (this.opt.headers.hasOwnProperty(key)) {
                xhr.setRequestHeader(key, encodeURIComponent(this.opt.headers[key]));
            }
        }
        xhr.onload = (ev) => {
            if (xhr.status === 200) {
                this.opt.onProgress(this.progress);
                if (n === t) {
                    this.res.push(xhr.response);
                }
                return this.uploadChunk(item);
            }

            return this.opt.onError(xhr.response);
        };
        xhr.onabort = () => {
            delete this.progress[id];
            return this.startUpload();
        }
        xhr.onerror = () => this.opt.onError(xhr.response);
        xhr.upload.onprogress = e => {
            if (e.lengthComputable) {
                this.progress[id] = +(e.loaded / e.total / t + (n - 1) / t).toFixed(2);
                if (n !== t) {
                    this.opt.onProgress(this.progress);
                }
            }
        };

        const formData = new FormData();
        formData.append('file', chunk);
        xhr.send(formData);
        this._xhr[id] = xhr;
    }

    startUpload(): void {
        const item = this._data.shift();
        if (!item) {
            if (this.isFinished()) {
                this.opt.onSuccess(this.res);
            }
            return;
        }

        if (this._aborted.indexOf(item.id) > -1) return this.startUpload();
        this.uploadChunk(item);
    }

    submit(data: IReq[] | IReq) {
        if (!this.isFinished()) {
            return console.warn('Must be waiting upload finished!');
        }

        // reset
        this.res = [];
        this.progress = {};
        this._aborted = [];

        const items = ([] as IReq[]).concat(data);

        const ids = items.map(file => file.id);
        this._data = items.map(item => {
            const total = Math.ceil(item.file.size / this.opt.partSize);
            const chunks = new Array(total).fill(0).map((_, j) => {
                return item.file.slice(j * this.opt.partSize, (j + 1) * this.opt.partSize);
            });
            return {
                id: item.id,
                file: item.file,
                total,
                chunks,
            }
        });

        this.query(ids, () => {
            let i = Math.min(this.opt.parallel, items.length);
            while (i > 0) {
                i--;
                this.startUpload();
            }
        });
    }
}