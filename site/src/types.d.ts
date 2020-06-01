declare function md5(arg: string | Buffer | ArrayBuffer): string

declare namespace NodeJS {
    export interface ProcessEnv {
        PARTSIZE: string;
        REMOTE_HOST: string;
    }
}