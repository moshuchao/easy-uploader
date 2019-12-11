var $file = document.getElementById('file');
var $imagesContainer = document.getElementById('images-container');
var imageTpl = document.getElementById('image-tpl').innerHTML;
var $uploader = document.getElementById('uploader');


var uploadFiles = [];

var uploader = new Uploader('/upload', {
    onSuccess(res) {
        console.log(res)
    },
    onError(ev) {
        console.log(ev)
    },
    onProgress(progress) {
        for (var id in progress) {
            if (progress.hasOwnProperty(id)) {
                setProgress(id, progress[id]);
            }
        }
    },
    headers: {
        'token': 'anything',
    }
});

var onSelectImageChange = function (files) {
    if (!files.item(0)) return;

    var createReader = function (file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function (ev) {
                return resolve({
                    uploadId: md5(ev.target.result),
                    input: file,
                });
            }

            reader.onerror = reject;

            reader.readAsArrayBuffer(file)
        });
    }

    var promises = Array.from(files).map(createReader);

    Promise.all(promises).then(function (md5Files) {
        var uploadImage = md5Files.map(function (file, i) {
            return imageTpl
                .replace(/{id}/g, file.uploadId)
                .replace('{src}', window.URL.createObjectURL(file.input))
                .replace('{alt}', file.input.name)
                .replace('{size}', (file.input.size / 1024).toFixed(2) + 'kb')
                .replace(/{index}/g, i)
                .trim()
        });

        $uploader.insertAdjacentHTML('beforebegin', uploadImage.join(''));
        uploadFiles = uploadFiles.concat(md5Files);
    })
}

var revokeObjectURL = function (url) {
    window.URL.revokeObjectURL(url);
}

var submitImages = function () {
    if (uploadFiles.length > 0) {
        uploader.submit(uploadFiles);
        // uploadFiles.forEach(function (file) {
        //     setProgress(file.uploadId, 0);
        // })
    }
}

var setProgress = function (id, p) {
    var $node = document.getElementById(id);
    if ($node) {
        p = +(p * 100).toFixed(2) + '%';
        $node.querySelector('.uploader-file_progress_text').textContent = p;
        $node.querySelector('.uploader-file_progress_inner').style.width = p;
    }
}
var onAbort = function (id) {
    uploader.abort(id);
    var elem = document.getElementById(id);
    elem.parentNode.removeChild(elem);
    var i = uploadFiles.findIndex(function (file) {
        return file.uploadId === id;
    });
    uploadFiles.splice(i, 1);
}

var onAbortAll = function () {
    uploader.abortAll();
}