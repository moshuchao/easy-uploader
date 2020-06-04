# 功能
针对大文件，配合使用md5，可分片上传、断点上传。[预览](https://easy-uploader.now.sh/)

# Install
``` bash
yarn add easy-uploader.js
```

# 快速使用
``` js
// 1.导入
import Uploader from 'easy-uploader.js'

// 2.创建实例
const uploader = new Uploader('/api/upload-files',options);

// 3.创建md5
const md5Map = uploader.makeMd5(FileList);

// 4.上传文件
uploader.submit();
```

# 说明
## 1.构造函数Uploader options:
- partSize: 分片大小，number, default: 1MB
- parallel: 并行下载任务（仅当上传多个文件时候），number, default: 1
- headers: {}

## 2.实例方法
- `makeMd5(FileList)`：根据FileList生成对应的md5
- `submit()`：提交/上传
- `abort(md5)`：取消上传
- `abortAll()`：取消全部

## 3.实例属性
- `onprogress`：Function，返回进度数据
- `onsuccess`：Function，全部上传完成后返回结果
- `onerror`：Function，上传途中出错返回错误信息
