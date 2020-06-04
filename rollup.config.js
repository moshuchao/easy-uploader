// rollup.config.js
import pkg from './package.json';
import ts from 'rollup-plugin-typescript2'
import { terser } from "rollup-plugin-terser";

const banner = `
/**
 * ${pkg.name} v${pkg.version}
 * @author ${pkg.author}
 * @license ${pkg.license}
 */
`;

export default {
    input: 'src/uploader.ts',
    output: [{
        file: pkg.main,
        format: 'umd',
        name: 'Uploader',
        banner,
        globals: {
            'spark-md5': 'SparkMD5'
        }
    }, {
        file: pkg.module,
        format: 'es',
        banner,
    }],
    plugins: [ts(), terser({
        output: {
            comments: function (node, comment) {
                if (comment.type === 'comment2') {
                    // multiline commenta
                    return /@preserve|@license/i.test(comment.value);
                }
                return false;
            }
        }
    })],
    external: ['spark-md5']
};