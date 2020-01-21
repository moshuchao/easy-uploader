import React from 'react'
import Uploader from '../../src/uploader'

type Res = {
    result: any[]
    progress: { [id: string]: number }
    error: Error | undefined
}

export default (url = '/upload'): [Res, () => Uploader] => {
    const ref = React.useRef<Uploader>();
    const [result, onSuccess] = React.useState<Res['result']>([]);
    const [progress, onProgress] = React.useState<Res['progress']>({});
    const [error, onError] = React.useState<Res['error']>();

    const cb = React.useCallback(() => {
        if (!ref.current) {
            ref.current = new Uploader(url, {
                onSuccess,
                onError,
                onProgress: v => onProgress(Object.assign({}, v)),
            });
        }

        return ref.current;
    }, []);

    return [{ result, progress, error }, cb]
}