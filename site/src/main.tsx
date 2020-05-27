import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(<App />, document.getElementById('root'));

if ((module as any).hot) {
    (module as any).hot.dispose(function () { });
    (module as any).hot.accept(function () { });
}