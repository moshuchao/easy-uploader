import React, { useEffect } from 'react'
import useReader from './useReader'
import useUploader from './useUploader'

const promise = (time: number) => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, time, time);
    })
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
                        <p>size: {item.file.size}<i>b</i> </p>
                        {progress[item.id]
                            && (<p>progress: {+(progress[item.id] * 100).toFixed(2) + '%'}
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