const express = require("express");
const Busboy = require('busboy');
const crypto = require("crypto");
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();

app.use('/dist', express.static('dist'));
app.use('/js', express.static('js'));
app.use('/css', express.static('css'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const fileStorage = {};

if (!fs.existsSync('uploads/')) {
    fs.mkdirSync('uploads')
}

app.get('/', (req, res) => {
    const stream = fs.createReadStream('index.html');
    stream.on('open', () => stream.pipe(res));
    stream.on('close', () => res.end());
})

// app.post('/upload/init', (req, res, next) => {
//     const files = [];
//     req.body.forEach(file => {
//         const id = crypto.randomBytes(8).toString('hex');
//         const filePath = 'uploads/' + Date.now() + '_' + id + file.name.substring(file.name.lastIndexOf('.'));
//         files.push({
//             id,
//             url: filePath,
//         });
//         fileStorage[id] = {
//             total: file.total,
//             path: filePath,
//             chunks: [],
//         }
//     });

//     res.json(files);
// })


app.post("/upload", function (req, res, next) {
    const busboy = new Busboy({ headers: req.headers });
    const fileId = req.headers['x-file-id'];
    const fileName = decodeURIComponent(req.headers['x-file-name']);
    const chunkNum = req.headers['x-chunk-num'];
    const total = req.headers['x-chunk-total'];

    if (!fileId || !chunkNum || !total || !fileName) return res.sendStatus(400);

    if (!fileStorage[fileId]) {
        fileStorage[fileId] = [];
    }
    const chunks = fileStorage[fileId];

    // return res.sendStatus(500)

    busboy.on('file', (fieldname, rdStream, filename, encoding, mimetype) => {
        const partChunks = [];
        rdStream.on('data', data => {
            partChunks.push(data);
        });
        rdStream.on('end', () => {
            chunks[chunkNum - 1] = Buffer.concat(partChunks);
        });
    })

    busboy.on('finish', () => {
        if (chunkNum === total) {
            const id = crypto.randomBytes(8).toString('hex');
            const filePath = 'uploads/' + id + '_' + fileName;
            const stream = fs.createWriteStream(filePath);
            stream.write(Buffer.concat(chunks));
            stream.end();

            delete fileStorage[fileId];
            return res.send(filePath)
        }

        res.send();
    });

    req.pipe(busboy);
});

app.listen(3000);