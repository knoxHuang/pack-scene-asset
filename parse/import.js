let directoryList = [];
let allFileList = [];
let assetTypeList = null;
let imgList = [];
let metaList = [];

let ResInfo = function (path, parent) {
    let info = Path.parse(path);
    this.name = info.name + info.ext;
    this.path = path;
    this.type = assetTypeList[this.name];
    if (this.type === 'texture' || this.type === 'sprite-frame') {
        this.icon = imgList[info.name];
    }
    else {
        this.icon = 'unpack://static/icon/assets/' + this.type + '.png';
    }
    this.selected = true;
    this.parent = parent;
};

let FileRoot = function (path, parent) {
    let info = Path.parse(path);
    this.name = info.name;
    this.path = path;
    this.children = [];
    this.type = 'directory';
    this.folded = true;
    this.selected = true;
    this.parent = parent;
};

function _getDirectoryInfo (dir) {
    return directoryList[dir];
}

function getParent (path) {
    let parseInfo = Path.parse(path);
    if (!parseInfo.dir) {
        return null;
    }
    let parent = _getDirectoryInfo(parseInfo.dir);
    if (!parent) {
        return getParent(parseInfo.dir);
    }
    return parent;
}

function _createFileTree (path, root) {
    let parseInfo = Path.parse(path);
    if (!parseInfo.dir && root) {
        if (!parseInfo.ext) {
            let dirInfo = new FileRoot(path, root);
            if (root.children.indexOf(dirInfo) === -1) {
                root.children.push(dirInfo);
                directoryList[parseInfo.name] = dirInfo;
                allFileList.push(dirInfo);
            }
        }
        else {
            let resInfo = new ResInfo(path, root);
            if (root.children.indexOf(resInfo) === -1) {
                root.children.push(resInfo);
                allFileList.push(resInfo);
            }
        }
    }
    else {
        let parentDir = _getDirectoryInfo(parseInfo.dir);
        if (!parentDir) {
            parentDir = new FileRoot(parseInfo.dir, getParent(parseInfo.dir));
            directoryList[parseInfo.dir] = parseInfo;
        }
        if (!parseInfo.ext) {
            let dirInfo = new FileRoot(path, parentDir);
            if (parentDir.children.indexOf(dirInfo) === -1) {
                parentDir.children.push(dirInfo);
                let dir = parseInfo.dir + '/' + parseInfo.name;
                directoryList[dir] = dirInfo;
                allFileList.push(dirInfo);
            }
        }
        else {
            let resInfo = new ResInfo(path, parentDir);
            if (parentDir.children.indexOf(resInfo) === -1) {
                parentDir.children.push(resInfo);
                allFileList.push(resInfo);
            }
        }
    }
}

function _onInit () {
    allFileList = [];
    directoryList = [];
    assetTypeList = [];
    imgList = [];
    metaList = [];
}

function _arrayBufferToBase64( buffer ) {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

exports.onFolderParse = function (path, callback) {
    _onInit();

    let fileTree = new FileRoot(path);
    JSZipUtils.getBinaryContent(path, function (err, data) {
        if (err) {
            throw err;
        }
        JSZip.loadAsync(data).then((zip) => {
            try {
                // 解决后缀名的问题
                zip.file(Utils.ASSET_TYPE)
                    .async("string")
                    .then((content) => {
                        assetTypeList = JSON.parse(content);
                        for (let key in zip.files) {
                            console.log(key);
                            let file = zip.files[key];
                            if (key === Utils.ASSET_TYPE) {
                                continue;
                            }
                            if (key.endsWith('.meta')) {
                                // 存储 meta 文件，用来判断是否有相同 uuid 但是路径不同的问题
                                // 如果是这样要提示用户不能导入
                                file.async("string")
                                    .then((content) => {
                                        metaList.push({
                                            meta: JSON.parse(content),
                                            path: key.replace('.meta', '')
                                        });
                                    });
                                continue;
                            }
                            let info = Path.parse(key);
                            if (info.ext === '.png' || info.ext === '.jpg') {
                                file.async("arraybuffer")
                                    .then((buffer) => {
                                        let str = _arrayBufferToBase64(buffer);
                                        let pIndex = key.indexOf('.');
                                        let type = key.substr(pIndex + 1);
                                        imgList[info.name] = 'data:image/' + type + ';base64,' + str;
                                        _createFileTree(key, fileTree);
                                    });
                            }
                            else {
                                _createFileTree(key, fileTree);
                            }
                        }
                    });

                callback && callback({
                    fileTree: fileTree,
                    allFileList: allFileList,
                    metaList: metaList
                });
            }
            catch (err) {
                Utils.showErrorMessageBox(Editor.T('IMPORT_ASSET.parse_zip_err_title'), Editor.T('IMPORT_ASSET.parse_zip_err_content'));
                callback && callback(null);
            }

        });
    });
};
