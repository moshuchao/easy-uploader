/*! uploader.js version 1.0.0 */
!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e=e||self).Uploader=t()}(this,function(){"use strict";function e(){}var r={partSize:1024*Math.pow(2,7),onError:e,onProgress:e,onSuccess:e,headers:{},parallel:1},o="UPLOAD_FILE";function t(e,t){void 0===t&&(t={}),this.progress={},this.res=[],this._xhrs={},this._abortedFiles=[],this.url=e,this.opt=Object.assign({},r,t)}return t.prototype.getLoadedFile=function(){var e=sessionStorage.getItem(o);return e?JSON.parse(e):{}},t.prototype.isLoaded=function(e,t){return t<=this.getLoadedFile()[e]},t.prototype.setLoadedFile=function(e,t){var r=this.getLoadedFile();r[e]=t,sessionStorage.setItem(o,JSON.stringify(r))},t.prototype.removeLoadedFile=function(e){var t=this.getLoadedFile();delete t[e],sessionStorage.setItem(o,JSON.stringify(t))},t.prototype.abortAll=function(){for(var e in this._xhrs)this._xhrs.hasOwnProperty(e)&&this.abort(e)},t.prototype.abort=function(e){if(!this._xhrs[e])return console.warn("Can not abort xhr!");this._abortedFiles.push(e),this._xhrs[e].forEach(function(e){if(0<e.readyState&&e.readyState<4)return e.abort()})},t.prototype.submit=function(e){var p=this;if(0<Object.keys(this._xhrs).length)return console.warn("Must be waiting upload finished!");this.res=[];for(var o=e.map(function(a,u){var d=Math.ceil(a.input.size/p.opt.partSize);return p._xhrs[a.uploadId]=[],new Array(d).fill(0).reduce(function(e,t,i){return p.isLoaded(a.uploadId,i)||e.push(function(){return new Promise(function(t,r){if(-1<p._abortedFiles.indexOf(a.uploadId))return t({type:"abort"});var e=a.input.slice(i*p.opt.partSize,(i+1)*p.opt.partSize),o=new FormData;o.append("file",e);var n=new XMLHttpRequest;for(var s in n.open("post",p.url),n.setRequestHeader("X-File-Id",a.uploadId),n.setRequestHeader("X-File-Name",encodeURIComponent(a.input.name)),n.setRequestHeader("X-Chunk-Num",i+1+""),n.setRequestHeader("X-Chunk-Total",d+""),p.opt.headers)p.opt.headers.hasOwnProperty(s)&&n.setRequestHeader(s,encodeURIComponent(p.opt.headers[s]));n.onload=function(e){return 200===n.status?(p.setLoadedFile(a.uploadId,i),p.opt.onProgress(p.progress),i+1===d&&(p.removeLoadedFile(a.uploadId),p.res[u]=n.response),t(e)):r(n.response)},n.onabort=t,n.onerror=r,n.upload.onprogress=function(e){e.lengthComputable&&(p.progress[a.uploadId]=+(e.loaded/e.total/d+i/d).toFixed(2),i+1!==d&&p.opt.onProgress(p.progress))},n.send(o),p._xhrs[a.uploadId].push(n)})}),e},[])}),n=function(){var t=o.shift();if(t){var r=function(){var e=t.shift();if(!e)return n();e().then(function(e){return"abort"===e.type?n():r()}).catch(p.opt.onError)};r()}else Object.keys(p._xhrs).filter(function(e){return p._abortedFiles.indexOf(e)<0}).every(function(e){return p._xhrs[e].every(function(e){return 4===e.readyState})})&&(p.opt.onSuccess(p.res.filter(function(e){return e})),p._xhrs={},p.progress={},p._abortedFiles=[])},t=0,r=Math.max(5,Math.min(this.opt.parallel,e.length));t<r;t++)n()},t});
