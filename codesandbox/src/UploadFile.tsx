import React, { useEffect } from 'react'
import useReader from './useReader'
import useUploader from './useUploader'

const promise = (time: number) => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, time, time);
    })
}

const formatFileSize = (total: number) => {
    const unit = ['B', 'KB', 'MB', 'GB']
    let result = total;
    while (result / 1024 > 1 && unit.length > 1) {
        result = result / 1024;
        unit.shift();
    }

    return result.toFixed(2) + unit[0];
}

export default (props: any) => {
    const [data, setData] = React.useState<{ id: string, file: File }[]>([]);
    const readAsArrayBuffer = useReader();
    const [{ progress, result }, createUploader] = useUploader();
    const uploader = createUploader();

    const onChange = (files: FileList | null) => {
        if (!files || !files.length) return;
        const _files = Array.from(files);
        Promise.all(_files.map(readAsArrayBuffer)).then(res => {
            const data = res.map((item, i) => ({ id: md5(item), file: _files[i] }))
            setData(data);
            uploader.submit(data)
        })
    }

    return (
        <div>
            <ol>
                {data.map((item) =>
                    <li key={item.id}>
                        <p>{item.file.name}</p>
                        <p>size:<i>{formatFileSize(item.file.size)}</i></p>
                        {progress[item.id]
                            && (<p>progress:{+(progress[item.id] * 100).toFixed(2) + '%'}
                                {progress[item.id] < 1 && <button onClick={() => uploader.abort(item.id)}>cancel</button>}
                            </p>)
                        }
                    </li>
                )}
            </ol>
            <p>{JSON.stringify(result)}</p>
            <label>
                <input type="file" name="file" id="file" multiple onChange={ev => onChange(ev.target.files)} />
            </label>
        </div>
    )
}