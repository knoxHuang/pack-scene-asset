const Url = require('fire-url');
const Async = require('async');
const Depend = require('./depend');

let visitedFolders = [];
let visitedFiles = [];
let allAssets = [];

let ResInfo = function (info) {
    this.info = info;
    this.type = info.type || '';
    this.icon = Utils.getIcon(info.uuid);
    this.selected = true;
    this.parent = null;
    if (info.type === 'sprite-frame') {
        let meta = Editor.assetdb.remote.loadMetaByUuid(info.uuid);
        this.url = Editor.assetdb.remote.uuidToFspath(meta.rawTextureUuid);
        this.name = Path.basename(this.url);
    }
    else {
        this.url = info.path;
        this.name = Path.basename(info.path);
    }
};

let FileRoot = function (name, url) {
    this.name = name || '';
    this.url = url || '';
    this.children = [];
    this.type = 'directory';
    this.folded = true;
    this.selected = true;
    this.parent = null;
};

function _getFileInfo (url) {
    for (let i = 0; i < visitedFolders.length; ++i) {
        let file = visitedFolders[i];
        if (file.url === url) {
            return file;
        }
    }
    return null;
}

function _hasContainRes (uuid) {
    return visitedFiles.indexOf(uuid) !== -1;
}

function _analysisUrl (idx, rootPath, assetTree, urlArr, info) {
    idx++;
    let name = urlArr[idx];
    rootPath += ('\\' + name);
    let stat = Fs.statSync(rootPath);
    if (stat.isDirectory()) {
        let fileInfo = _getFileInfo(rootPath);
        if (!fileInfo) {
            fileInfo = new FileRoot(name, rootPath);
            fileInfo.parent = assetTree;
            assetTree.children.push(fileInfo);
            visitedFolders.push(fileInfo);
            allAssets.push(fileInfo);
        }
        _analysisUrl(idx, rootPath, fileInfo, urlArr, info);
    }
    else {
        if (!_hasContainRes(info.uuid)) {
            let resInfo = new ResInfo(info);
            resInfo.parent = assetTree;
            assetTree.children.push(resInfo);
            visitedFiles.push(info.uuid);
            allAssets.push(resInfo);
        }
    }
}

function _addFileAndResInfo (info, assetTree) {
    let url = info.url.slice('db://assets/'.length);
    let urlArr = url.split('/');
    if (urlArr.length === 1) {
        let resInfo = new ResInfo(info);
        resInfo.parent = assetTree;
        assetTree.children.push(resInfo);
        visitedFiles.push(info.uuid);
        allAssets.push(resInfo);
    }
    else {
        let idx = -1;
        let rootPath = Editor.projectInfo.path + '\\assets';
        _analysisUrl(idx, rootPath, assetTree, urlArr, info);
    }
}

function _onInitData () {
    visitedFolders = [];
    visitedFiles = [];
    allAssets = [];
}

module.exports = {

    queryAssetTreeByUuidList: function (uuidList, callback) {
        _onInitData();
        let assetTree = new FileRoot('Assets');
        Async.each(uuidList,
            (uuid, next) => {
                Editor.assetdb.queryInfoByUuid(uuid, (err, info) => {
                    if (err) {
                        return next();
                    }

                    // 判断是否是内置资源，如果是则不需要导出
                    if (info.url.indexOf(Depend.INTERNAL) !== -1) {
                        return next();
                    }

                    _addFileAndResInfo(info, assetTree);
                    next();
                });
            },
            () => {
                // 排序 asset tree
                Depend.sortAssetTree(assetTree, () => {
                    callback(null, {
                        assetTree: assetTree,
                        allAssets: allAssets
                    });
                });
            }
        );
    }
};
