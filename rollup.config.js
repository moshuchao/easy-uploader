// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import { uglify } from "rollup-plugin-uglify";
import { version } from './package.json';

const banner = '/*! uploader.js version ' + version + ' */';

export default {
    input: 'src/uploader.ts',
    output: [{
        file: 'dist/uploader.umd.js',
        format: 'umd',
        name: 'Uploader',
        banner,
    }, {
        file: 'dist/uploader.cjs.js',
        format: 'cjs',
        banner,
    }],
    plugins: [typescript(), uglify({
        output: {
            comments: function (node, comment) {
                if (comment.type === 'comment2') {
                    // multiline comment
                    return /@preserve|@license|@cc_on|^!/i.test(comment.value);
                }
                return false;
            }
        }
    })],
};