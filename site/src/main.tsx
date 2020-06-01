import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

function arrayBufferHack(this: Blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        }

        reader.readAsArrayBuffer(this)
    })
}

File.prototype.arrayBuffer = File.prototype.arrayBuffer || arrayBufferHack;
Blob.prototype.arrayBuffer = Blob.prototype.arrayBuffer || arrayBufferHack;

ReactDOM.render(<App />, document.getElementById('root'));

if ((module as any).hot) {
    (module as any).hot.dispose(function () { });
    (module as any).hot.accept(function () { });
}