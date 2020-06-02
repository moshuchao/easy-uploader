import React, { useState, useCallback, ChangeEvent, useRef, FormEvent, useEffect } from 'react';
import './style.less';
import Uploader from '../../src/uploader';

const uploader = new Uploader(process.env.REMOTE_HOST + '/api/upload-files', {
    partSize: +process.env.PARTSIZE
});

const FileItem = (props: { index: number, file: File, progress: number, url: string, onCancel: () => void }) => (
    <li className="file-item">
        <div className="file-item-body">
            <em>{props.index + 1}.</em>
            <span className="file-name">{props.file.name}</span>
            {props.url
                ? <a className="btn btn-link" href={process.env.REMOTE_HOST + props.url} target="_blank" rel="noopener noreferrer">download</a>
                :
                <button type="button" className="btn btn-warning" onClick={props.onCancel}>cancel</button>
            }
        </div>
        <div className="progress" style={{ width: (props.progress * 100).toFixed(2) + '%' }}></div>
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

    const onCancel = useCallback((index: number, id: string) => {
        uploader.abort(id);
        setUploadedData(prevState => {
            const copy = [...prevState];
            copy.splice(index, 1);
            return copy
        })
    }, []);

    return (
        <div>
            <form onSubmit={onSubmit} className="form-container">
                <label className="uploader">
                    <input type="file" multiple onChange={onChange} />
                    <span className="uploader-text">Chooses your files</span>
                </label>
                <ol className="uploader-list">
                    {uploadedData.map((item, i) => (
                        <FileItem
                            index={i}
                            file={item[0]}
                            key={item[1]}
                            progress={progress[item[1]]} url={fileUrlMap[item[1]]}
                            onCancel={() => onCancel(i, item[1])}
                        />
                    ))}
                </ol>
                <button type="submit" className="btn btn-primary">submit</button>
            </form>
        </div>
    )
}