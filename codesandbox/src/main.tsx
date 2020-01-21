import React from 'react'
import ReactDom from 'react-dom'

import App from './App'

const root = document.getElementById('root')
ReactDom.render(<App />, root)


if ((module as any).hot) {
    (module as any).hot.dispose(function () {
        // 模块即将被替换时
    });

    (module as any).hot.accept(function () {
        // 模块或其依赖项之一刚刚更新时
    })
}