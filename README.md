# Easy-uploader
A modern file uploader

## Features
- Lightweight(no dependencies)
- Supports breakpoint
- Supports fragment
- Parallel transmission
- Real-time progress
- Cancelable

## Installation
``` bash
npm install easy-uploader --save
```
## Usage
1. import Uploader
``` js
import Uploader from 'easy-uploader'
```
2. create a instance
``` js
const instance = new Uploader('/upload')
```
3. select file and upload
``` js
instance.submit([{id, input:'your file'}])
```
## Docs
``` js
const instance = new Uploader(url, options)
```
options:
- partSize: number, default: 131072(byte)
- parallel: number, default: 1
- onError: function(err){}
- onProgress: function(percent){}
- onSuccess: function(response){}
- headers: {}

instance methods
- submit([{id,input}]): id: string; input: File;
- abort(id): id: string, above id;
- abortAll()

request headers:
- X-Chunk-Num
- X-Chunk-Total
- X-File-Id
- X-File-Name
- custom header

## Important
1. Easy-uploader uses native js, include `Promise`, `Array.every`. if supports lower browsers, remember to use polyfills. 
2. To use breakpoint, may be using md5.js(third-party lib). Such as `js-md5`(in my example).
3. Id is important. It will be randomstring, filename, or created-string by md5.js. Keep it only one.
