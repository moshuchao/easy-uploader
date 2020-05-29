import EventEmitter from './event-emitter';
import { Dict, SubmitData, SuccessCallback, ProgressCallback, ErrorCallback, Res, OptionsProps } from './types';

const defaultOpt: OptionsProps = {
    partSize: 100000,
    headers: {},
    parallel: 1,
}

export default class Uploader extends EventEmitter {
    private url: string;
    private progress: ProgressCallback = {}
    private opt: OptionsProps
    private res: SuccessCallback = {}
    private uploaded: Dict<number[]> = {}
    private aborted: string[] = [];

    constructor(url: string, opt = {}) {
        super();
        this.url = url;
        this.opt = Object.assign({}, defaultOpt, opt);
    }

    isFinished() {
        return Object.keys(this.progress).every(id => this.progress[id] === 1);
    }

    abortAll() {
        this.aborted = Object.keys(this.progress);
    }

    abort(id: string) {
        this.aborted.push(id);
    }

    hasAborted(id: string) {
        return this.aborted.includes(id);
    }

    submit(data: SubmitData[] | SubmitData) {
        if (!this.isFinished()) {
            return console.warn('Must be waiting upload finished!');
        }

        // reset
        this.res = {};
        this.progress = {};
        this.aborted = [];
        this.uploaded = {};

        const items = ([] as SubmitData[]).concat(data).map(item => {
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

        const uploadFile = () => {
            const item = items.shift();
            if (!item) {
                if (this.isFinished()) {
                    this.emit('success', this.res);
                }

                return;
            }

            const chunks = item.chunks;
            const id = item.id;
            this.uploaded[id] = [];
            const uploadChunk = () => {
                const chunk = chunks.shift();

                if (!chunk || this.hasAborted(id)) {
                    uploadFile();
                    return;
                }

                const cur = item.total - chunks.length;
                if (this.uploaded[id]?.includes(cur)) {
                    uploadChunk();
                    return;
                }

                const t = item.total;
                const xhr = new XMLHttpRequest();
                xhr.open('post', this.url);
                xhr.setRequestHeader('x-md5', id);
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
                            this.progress[id] = 1;
                            this.res[id] = res.url;
                            this.emit('progress', this.progress);
                            return uploadFile();
                        }

                        if (res.uploaded) {
                            this.uploaded[id] = res.uploaded;
                        }

                        return uploadChunk();
                    }

                    return this.emit('error', xhr.response);
                };
                xhr.onabort = () => {
                    delete this.progress[id];
                    return uploadFile();
                }
                xhr.onerror = () => this.emit('error', xhr.response);
                xhr.upload.onprogress = e => {
                    if (this.hasAborted(id)) {
                        return xhr.abort();
                    }

                    if (e.lengthComputable) {
                        this.progress[id] = +(e.loaded / e.total / t + (cur - 1) / t).toFixed(2);
                        if (cur !== t) {
                            this.emit('progress', this.progress);
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