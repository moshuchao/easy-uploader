(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.Uploader = factory());
}(this, (function () { 'use strict';

    var noop = function () { };
    var defaultOpt = {
        partSize: 1024 * Math.pow(2, 7),
        onError: noop,
        onProgress: noop,
        onSuccess: noop,
    };
    var SESSION_KEY = 'UPLOAD_FILE';
    var Uploader = /** @class */ (function () {
        function Uploader(url, opt) {
            this.progress = [];
            this.res = [];
            this.url = url;
            var _opt = Object.assign({}, defaultOpt, opt);
            this.partSize = _opt.partSize;
            this.onError = _opt.onError;
            this.onProgress = _opt.onProgress;
            this.onSuccess = _opt.onSuccess;
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
        Uploader.prototype.submit = function (files) {
            var _this = this;
            var tasks = files.map(function (file, i) {
                var n = Math.ceil(file.input.size / _this.partSize);
                return new Array(n).fill(0).reduce(function (acc, _, j) {
                    if (_this.isLoaded(file.uploadId, j)) {
                        return acc;
                    }
                    var p = function () { return new Promise(function (resolve, reject) {
                        var partFile = file.input.slice(j * _this.partSize, (j + 1) * _this.partSize);
                        var formData = new FormData();
                        formData.append('file', partFile);
                        var xhr = new XMLHttpRequest();
                        xhr.open('post', _this.url);
                        xhr.setRequestHeader('X-File-Id', file.uploadId);
                        xhr.setRequestHeader('X-File-Name', file.input.name);
                        xhr.setRequestHeader('X-Chunk-Num', j + 1 + '');
                        xhr.setRequestHeader('X-Chunk-Total', n + '');
                        xhr.onload = function (ev) {
                            if (xhr.status === 200) {
                                _this.setLoadedFile(file.uploadId, j);
                                _this.onProgress(_this.progress);
                                if (j + 1 === n) {
                                    _this.removeLoadedFile(file.uploadId);
                                    _this.res[i] = xhr.response;
                                }
                                return resolve();
                            }
                            return reject(xhr.response);
                        };
                        xhr.onerror = reject;
                        xhr.upload.onprogress = function (e) {
                            if (e.lengthComputable) {
                                _this.progress[i] = +(e.loaded / e.total / n + j / n).toFixed(2);
                                if (j + 1 !== n) {
                                    _this.onProgress(_this.progress);
                                }
                            }
                        };
                        xhr.send(formData);
                    }); };
                    acc.push(p);
                    return acc;
                }, []);
            });
            var upload = function () {
                var promises = tasks.shift();
                if (!promises) {
                    _this.onSuccess(_this.res);
                    return;
                }
                var uploadPart = function () {
                    var promise = promises.shift();
                    if (!promise)
                        return upload();
                    promise()
                        .then(uploadPart) // next part
                        .catch(_this.onError);
                };
                uploadPart();
            };
            upload();
        };
        return Uploader;
    }());

    return Uploader;

})));
