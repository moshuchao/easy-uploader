interface SubmitData {
    id: string;
    file: File
}

type SuccessCbProps = {
    [md5: string]: string;
}

type Progress = {
    [md5: string]: number;
}

type Res = {
    uploaded?: number[];
    url?: string;
}

const noop = (data?: any) => { }

const defaultOpt = {
    partSize: 100000,
    onError: noop,
    onProgress: (props: Progress) => { },
    onSuccess: (props: SuccessCbProps) => { },
    headers: {} as { [x: string]: string },
    parallel: 1,
}

type OptProps = typeof defaultOpt;

export default class Uploader {
    private url: string;
    private progress: Progress = {}
    private opt: OptProps
    private res: SuccessCbProps = {}
    private uploaded: { [x: string]: number[] } = {}
    private aborted: string[] = [];

    constructor(url: string, opt = {}) {
        this.url = url;
        this.opt = Object.assign({}, defaultOpt, opt);
    }

    isFinished() {
        return Object.keys(this.progress).every(id => this.progress[id] === 1);
    }

    abortAll() {

    }

    abort(id: string) {

    }

    submit(data: SubmitData[] | SubmitData) {
        if (!this.isFinished()) {
            return console.warn('Must be waiting upload finished!');
        }

        // reset
        this.res = {};
        this.progress = {};
        this.aborted = [];

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
                    this.opt.onSuccess(this.res);
                }

                return;
            }

            const chunks = item.chunks;
            const id = item.id;
            this.uploaded[id] = [];
            const uploadChunk = () => {
                const chunk = chunks.shift();

                if (!chunk || this.aborted.includes(id)) {
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
                    const res: Res = JSON.parse(xhr.response);
                    if (xhr.status === 200) {
                        if (res.url) {
                            this.progress[id] = 1;
                            this.res[id] = res.url;
                            this.opt.onProgress(this.progress);
                            return uploadFile();
                        }

                        if (res.uploaded) {
                            this.uploaded[id] = res.uploaded;
                        }

                        return uploadChunk();
                    }

                    return this.opt.onError(res);
                };
                xhr.onabort = () => {
                    this.aborted.push(id);
                    delete this.progress[id];
                    return uploadFile();
                }
                xhr.onerror = () => this.opt.onError(xhr.response);
                xhr.upload.onprogress = e => {
                    if (e.lengthComputable) {
                        this.progress[id] = +(e.loaded / e.total / t + (cur - 1) / t).toFixed(2);
                        if (cur !== t) {
                            this.opt.onProgress(this.progress);
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