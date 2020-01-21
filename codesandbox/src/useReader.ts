import React from 'react'

export default () => {
    return React.useCallback((file: File) => {
        return new Promise<string | ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = ev => {
                const result = ev.target?.result;
                if (result) resolve(result);
            }

            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        })
    }, []);
}