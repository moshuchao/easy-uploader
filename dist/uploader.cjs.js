'use strict';

var noop = function () { };
var defaultOpt = {
    partSize: 1024 * Math.pow(2, 7),
    onError: noop,
    onProgress: noop,
    onSuccess: noop,
    headers: {}
};
var SESSION_KEY = 'UPLOAD_FILE';
var Uploader = /** @class */ (function () {
    function Uploader(url, opt) {
        if (opt === void 0) { opt = {}; }
        this.progress = {};
        this.res = [];
        this._xhrs = [];
        this.url = url;
        this.opt = Object.assign({}, defaultOpt, opt);
    }
    Uploader.prototype.getLoadedFile = function () {
        var loaded = sessionStorage.getItem(SESSION_KEY);
        return loaded ? JSON.parse(loaded) : {};
    };
    Uploader.prototype.isLoaded = function (id, index) {
        return index <= this.getLoadedFile()[id];
    };
    Uploader.prototype.setLoadedFile = function (id, index) {
        var loaded = this.getLoadedFile();
        loaded[id] = index;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(loaded));
    };
    Uploader.prototype.removeLoadedFile = function (id) {
        var loaded = this.getLoadedFile();
        delete loaded[id];
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(loaded));
    };
    Uploader.prototype.abort = function (index) {
        this._xhrs[index].forEach(function (xhr) {
            if (xhr.readyState > 0 && xhr.readyState < 4) {
                return xhr.abort();
            }
        });
    };
    Uploader.prototype.submit = function (files) {
        var _this = this;
        var tasks = files.map(function (file, i) {
            var n = Math.ceil(file.input.size / _this.opt.partSize);
            _this._xhrs[i] = [];
            return new Array(n).fill(0).reduce(function (acc, _, j) {
                if (_this.isLoaded(file.uploadId, j)) {
                    return acc;
                }
                var p = function () { return new Promise(function (resolve, reject) {
                    var partFile = file.input.slice(j * _this.opt.partSize, (j + 1) * _this.opt.partSize);
                    var formData = new FormData();
                    formData.append('file', partFile);
                    var xhr = new XMLHttpRequest();
                    xhr.open('post', _this.url);
                    xhr.setRequestHeader('X-File-Id', file.uploadId);
                    xhr.setRequestHeader('X-File-Name', file.input.name);
                    xhr.setRequestHeader('X-Chunk-Num', j + 1 + '');
                    xhr.setRequestHeader('X-Chunk-Total', n + '');
                    for (var key in _this.opt.headers) {
                        if (_this.opt.headers.hasOwnProperty(key)) {
                            xhr.setRequestHeader(key, _this.opt.headers[key]);
                        }
                    }
                    xhr.onload = function (ev) {
                        if (xhr.status === 200) {
                            _this.setLoadedFile(file.uploadId, j);
                            _this.opt.onProgress(_this.progress);
                            if (j + 1 === n) {
                                _this.removeLoadedFile(file.uploadId);
                                _this.res[i] = xhr.response;
                            }
                            return resolve(ev);
                        }
                        return reject(xhr.response);
                    };
                    xhr.onabort = resolve;
                    xhr.onerror = reject;
                    xhr.upload.onprogress = function (e) {
                        if (e.lengthComputable) {
                            _this.progress[file.uploadId] = +(e.loaded / e.total / n + j / n).toFixed(2);
                            if (j + 1 !== n) {
                                _this.opt.onProgress(_this.progress);
                            }
                        }
                    };
                    xhr.send(formData);
                    _this._xhrs[i].push(xhr);
                }); };
                acc.push(p);
                return acc;
            }, []);
        });
        var upload = function () {
            var promises = tasks.shift();
            if (!promises) {
                _this.opt.onSuccess(_this.res.filter(function (content) { return content; }));
                return;
            }
            var uploadPart = function () {
                var promise = promises.shift();
                if (!promise)
                    return upload();
                promise()
                    .then(function (ev) {
                    if (ev.type === 'abort') {
                        return upload(); // next file
                    }
                    return uploadPart(); //next part
                })
                    .catch(_this.opt.onError);
            };
            uploadPart();
        };
        upload();
    };
    return Uploader;
}());

module.exports = Uploader;
