const express = require("express");
const Busboy = require('busboy');
const crypto = require("crypto");
const fs = require('fs');
const glob = require('glob');
const bodyParser = require('body-parser');

// console.log(fs.readFileSync('uploads/cebd877ac9610ac02ecb2ff9bae05438_1').length)
const app = express();

app.use(express.static('dist'));
app.use('/uploads', express.static('uploads'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

if (!fs.existsSync('uploads/')) {
    fs.mkdirSync('uploads')
}

function getFileNum(name = '') {
    return +(name.split('_')[1]);
}

app.post('/upload/query', (req, res) => {
    const ids = req.body.ids;
    if (!ids) return res.sendStatus(400);
    const result = ids.reduce((acc, id) => {
        acc[id] = Math.max.call(Math, 0, ...glob.sync('uploads/' + id + '_*').map(getFileNum));
        return acc;
    }, {});
    res.json(result);
});

app.post("/upload", function (req, res, next) {
    const busboy = new Busboy({ headers: req.headers });
    const fileId = req.headers['x-file-id'];
    const fileName = decodeURIComponent(req.headers['x-file-name']);
    const chunkNum = req.headers['x-chunk-num'];
    const total = req.headers['x-chunk-total'];

    if (!fileId || !chunkNum || !total || !fileName) return res.sendStatus(400);

    busboy.on('file', (fieldname, rdStream, filename, encoding, mimetype) => {
        const partChunks = [];
        rdStream.on('data', data => {
            partChunks.push(data);
        });
        rdStream.on('end', () => {
            writeFile('uploads/' + fileId + '_' + chunkNum, partChunks);
        });
    })

    busboy.on('finish', () => {
        if (chunkNum === total) {
            const id = crypto.randomBytes(8).toString('hex');
            const filePath = 'uploads/' + id + '_' + fileName;
            const chunks = [];
            const paths = glob.sync('uploads/' + fileId + '_*');

            const pushBuff = () => {
                const p = paths.shift();
                if (!p) {
                    return writeFile(filePath, chunks);
                };
                fs.readFile(p, (err, b) => {
                    if (err) {
                        console.log('err', err);
                        return;
                    }
                    chunks[getFileNum(p) - 1] = b;
                    fs.unlink(p, pushBuff)
                });
            }

            pushBuff();
            return res.send(filePath)
        }

        res.send();
    });

    req.pipe(busboy);
});

function writeFile(filePath, chunks) {
    const stream = fs.createWriteStream(filePath);
    stream.write(Buffer.concat(chunks));
    stream.end();
}

app.listen(8080);