import React, { useState, useCallback, ChangeEvent, useRef, FormEvent, useEffect } from 'react';
import Uploader from '../../src/uploader';

const uploader = new Uploader(process.env.REMOTE_HOST + '/api/upload-files', {
    partSize: +process.env.PARTSIZE
});

const FileItem = (props: { file: File, progress: number, url: string }) => (
    <li>
        <div>
            <span>{props.file.name}</span>
            {props.url
                ? <a href={process.env.REMOTE_HOST + props.url} target="_blank" rel="noopener noreferrer">download</a>
                :
                <button>cancel</button>
            }
        </div>
        <div>{props.progress}</div>
    </li>
);


export default () => {
    const [fileUrlMap, setFileUrlMap] = useState<{ [x: string]: string }>({});
    const [progress, setProgress] = useState<{ [x: string]: number }>({});
    const [uploadedData, setUploadedData] = useState<[File, string][]>([]);
    const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        if (e.target && e.target.files?.length) {
            const files = e.target.files;

            Promise
                .all(Array.from(files).map(file => file.slice(Math.floor(file.size / 10), 100000).arrayBuffer()))
                .then(res => {
                    setUploadedData(res.map((buff, i) => ([files[i], md5(buff) + files[i].size])));
                })
        }
    }, []);

    const onSubmit = useCallback((e: FormEvent) => {
        e.preventDefault();
        console.log(uploadedData);
        uploader.submit(uploadedData);
    }, [uploadedData]);

    useEffect(() => {
        uploader.onprogress = res => setProgress({ ...res });
        uploader.onsuccess = res => setFileUrlMap({ ...res });
    }, []);


    return (
        <div>
            <form onSubmit={onSubmit}>
                <input type="file" multiple onChange={onChange} />
                <ol>
                    {uploadedData.map(item => <FileItem file={item[0]} key={item[1]} progress={progress[item[1]]} url={fileUrlMap[item[1]]} />)}
                </ol>
                <button type="submit">submit</button>
            </form>
        </div>
    )
}