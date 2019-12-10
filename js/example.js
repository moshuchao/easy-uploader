var $file = document.getElementById('file');
var uploader = new Uploader('/upload', {
    onSuccess(files) {
        console.log(files)
    },
    onError(ev) {
        console.log(ev)
    },
    onProgress(p) {
        console.log(p)
    },
    headers: {
        'token': 'anything',
    }
});
$file.onchange = function (ev) {
    if (!this.files.item(0)) return;

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

    var promises = Array.from(this.files).map(createReader);
    Promise.all(promises).then(function (files) {
        uploader.submit(files);
    })
}