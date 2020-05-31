import React, { useState, useCallback, ChangeEvent, useRef, FormEvent } from 'react';
import Uploader from '../../src/uploader';

const uploader = new Uploader('http://localhost:3000/api/upload-files');

uploader.on('success', (res) => {
    console.log(res);
});

uploader.on('progress', (progress) => {

    console.log(progress);
});

const FileItem = (props: { file: File }) => (
    <li>
        <div>
            <span>{props.file.name}</span>
            <button>cancel</button>
        </div>
        <div></div>
    </li>
);


export default () => {
    const [files, setFiles] = useState<File[]>([]);
    const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        if (e.target && e.target.files?.length) {
            setFiles(Array.from(e.target.files));
        }
    }, []);

    const onSubmit = useCallback((e: FormEvent) => {
        e.preventDefault();
        console.log(files);
        Promise
            .all(files.map(file => file.slice(Math.floor(file.size / 10), 100000).arrayBuffer()))
            .then(res => {
                uploader.submit(res.map((buff, i) => ({ id: md5(buff) + files[i].size, file: files[i] })));
            })
    }, [files]);


    return (
        <div>
            <form onSubmit={onSubmit}>
                <input type="file" multiple onChange={onChange} />
                <ol>
                    {files.map((file, i) => <FileItem file={file} key={i} />)}
                </ol>
                <button type="submit">submit</button>
            </form>
        </div>
    )
}