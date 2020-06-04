import SparkMD5 from 'spark-md5';
import { Dict, SuccessCallback, ProgressCallback, ErrorCallback, Res, OptionsProps, FileMd5 } from './types';


const defaultOpt: OptionsProps = {
    partSize: 100000,
    headers: {},
    parallel: 1,
}

function arrayBuffer(this: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result as ArrayBuffer);
        }

        reader.readAsArrayBuffer(this)
    })
}

export default class Uploader {
    private url: string;
    private progress: ProgressCallback = {}
    private opt: OptionsProps
    private res: SuccessCallback = {}
    private uploaded: Dict<number[]> = {}
    private aborted: string[] = [];
    private data: FileMd5[] = [];

    onprogress = (arg: ProgressCallback) => { }
    onsuccess = (arg: SuccessCallback) => { }
    onerror = (arg: ErrorCallback) => { }

    constructor(url: string, opt?: Partial<OptionsProps>) {
        this.url = url;
        this.opt = Object.assign({}, defaultOpt, opt);
    }

    isFinished() {
        return Object.keys(this.progress).every(md5 => this.progress[md5] === 1);
    }

    abortAll() {
        this.aborted = Object.keys(this.progress);
        this.data = [];
    }

    abort(md5: string) {
        this.aborted.push(md5);
        this.data = this.data.filter(item => item[1] !== md5);
    }

    hasAborted(md5: string) {
        return this.aborted.includes(md5);
    }

    makeMd5(filelist: FileList) {
        return Promise
            .all(Array.from(filelist).map(file => arrayBuffer.apply(file.slice(Math.floor(file.size / 10), 100000))))
            .then(res => {
                return this.data = res.map((buff, i) => ([filelist[i], SparkMD5.ArrayBuffer.hash(buff) + filelist[i].size]));
            })
    }

    submit() {
        if (!this.isFinished()) {
            return console.warn('Must be waiting upload finished!');
        }

        // reset
        this.res = {};
        this.progress = {};
        this.aborted = [];
        this.uploaded = {};

        const items = this.data.map(item => {
            const total = Math.ceil(item[0].size / this.opt.partSize);
            const chunks = new Array(total).fill(0).map((_, j) => {
                return item[0].slice(j * this.opt.partSize, (j + 1) * this.opt.partSize);
            });

            return {
                md5: item[1],
                file: item[0],
                total,
                chunks: [item[0].slice(0, 0)].concat(chunks),
            }
        });

        const uploadFile = () => {
            const item = items.shift();
            if (!item) {
                if (this.isFinished()) {
                    this.onsuccess(this.res);
                }

                return;
            }

            const chunks = item.chunks;
            const md5 = item.md5;
            this.uploaded[md5] = [];
            const uploadChunk = () => {
                const chunk = chunks.shift();

                if (!chunk || this.hasAborted(md5)) {
                    uploadFile();
                    return;
                }

                const cur = item.total - chunks.length;

                if (this.uploaded[md5]?.includes(cur)) {
                    uploadChunk();
                    return;
                }

                const t = item.total;
                const xhr = new XMLHttpRequest();
                xhr.open('POST', this.url);
                xhr.setRequestHeader('x-md5', md5);
                xhr.setRequestHeader('x-filename', encodeURIComponent(item.file.name));
                xhr.setRequestHeader('x-current', cur + '');
                xhr.setRequestHeader('x-total', item.total + '');
                for (const key in this.opt.headers) {
                    if (this.opt.headers.hasOwnProperty(key)) {
                        xhr.setRequestHeader(key, encodeURIComponent(this.opt.headers[key]));
                    }
                }
                xhr.onload = (ev) => {
                    if (xhr.status === 200) {
                        const res: Res = JSON.parse(xhr.response);
                        if (res.url) {
                            this.progress[md5] = 1;
                            this.res[md5] = res.url;
                            this.onprogress(this.progress);
                            return uploadFile();
                        }

                        if (res.uploaded) {
                            this.uploaded[md5] = res.uploaded;
                        }

                        return uploadChunk();
                    }

                    return this.onerror(xhr.response);
                };
                xhr.onabort = () => {
                    delete this.progress[md5];
                    return uploadFile();
                }
                xhr.onerror = () => this.onerror(xhr.response);
                xhr.upload.onprogress = e => {
                    if (this.hasAborted(md5)) {
                        return xhr.abort();
                    }

                    if (e.lengthComputable) {
                        this.progress[md5] = +(e.loaded / e.total / t + (cur - 1) / t).toFixed(2);
                        if (cur !== t) {
                            this.onprogress(this.progress);
                        }
                    }
                };

                const formData = new FormData();
                formData.append('file', chunk);
                xhr.send(formData);
            }

            uploadChunk();
        }

        let i = Math.min(this.opt.parallel, items.length);
        while (i > 0) {
            i--;
            uploadFile();
        }
    }
}