// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
// import path from 'path';

export default {
    input: 'src/uploader.ts',
    output: [{
        file: 'dist/uploader.umd.js',
        format: 'umd',
        name: 'Uploader',
    }, {
        file: 'dist/uploader.cjs.js',
        format: 'cjs',
    }],
    plugins: [resolve({
        // 将自定义选项传递给解析插件
        customResolveOptions: {
            moduleDirectory: 'node_modules'
        }
    }), commonjs({
        include: /node_modules/,
    }), typescript()],
};