
exports.findJS = function (fspath, callback) {
    var src = Fs.readFileSync(fspath, 'utf-8');
    var requires = Detective(src);
    if (!requires || requires.length === 0) {
        return;
    }
    var newItem;
    Editor.assetdb.queryAssets(null, 'javascript', (err, results) => {
        for (var i = 0; i < requires.length; ++i ) {
            for (var j = 0; j < results.length; ++j) {
                var asset = results[j];
                var name = Path.basename(asset.path);
                if (name === requires[i] + ".js") {
                    newItem = {
                        uuid: asset.uuid,
                        type: asset.type,
                        name: name,
                        selected: true,
                        fspath: asset.path,
                        icon: Utils.getIcon(asset.uuid)
                    };

                    if (callback) {
                        callback(newItem);
                    }
                    break;
                }
            }
        }
    });
};

exports.findDragonBones = function (asset, callback) {
    var uuid = asset.uuid;
    var meta = Editor.assetdb.remote.loadMetaByUuid(uuid);
    var faPath = Editor.assetdb.remote.uuidToFspath(meta.texture);
    // 判断是否是内置资源，如果是就不需要导出
    var builtIn = faPath.indexOf(Define.FILTERPATH) !== -1;
    if (builtIn) { return; }
    var itemInfo = {
        uuid: meta.texture,
        type: 'dragonbones',
        name: Path.basename(faPath),
        selected: true,
        fspath: faPath,
        icon: Utils.getIcon(meta.texture)
    };

    if (callback) {
        callback(itemInfo);
    }
};

exports.findSpine = function (asset, callback) {
    var uuid = asset.uuid;
    var meta = Editor.assetdb.remote.loadMetaByUuid(uuid);
    var faPath = Editor.assetdb.remote.uuidToFspath(meta.atlas);
    var builtIn = faPath.indexOf(Define.FILTERPATH) !== -1;
    if (builtIn) { return; }

    // spine atlas
    var itemInfo = {
        uuid: meta.atlas,
        type: 'spine',
        name: Path.basename(faPath),
        selected: true,
        fspath: faPath,
        icon: Utils.getIcon(meta.atlas)
    };

    if (callback) {
        callback(itemInfo);
    }

    for (var i = 0, len =  meta.textures.length; i < len; ++i) {
        uuid = meta.textures[i];
        faPath = Editor.assetdb.remote.uuidToFspath(uuid);
        builtIn = faPath.indexOf(Define.FILTERPATH) !== -1;
        if (builtIn) { return; }
        // spine texture
        itemInfo = {
            uuid: uuid,
            type: 'spine',
            name: Path.basename(faPath),
            selected: true,
            fspath: faPath,
            icon: Utils.getIcon(uuid)
        };

        if (callback) {
            callback(itemInfo);
        }
    }
};

const DOMParser = require('xmldom').DOMParser;
exports.findTiledMap = function (asset, callback) {
    var fsPath, uuid, itemInfo;
    var tsxContent = Fs.readFileSync(asset.path, 'utf-8');
    var tsxDoc = new DOMParser().parseFromString(tsxContent);
    var images = tsxDoc.getElementsByTagName('image');
    for (var i = 0, len = images.length; i < len; i++) {
        var imageCfg = images[i].getAttribute('source');
        if (imageCfg) {
            fsPath = Path.normalize(Path.join(Path.dirname(asset.path), imageCfg));
            uuid = Editor.assetdb.remote.fspathToUuid(fsPath);
            itemInfo = {
                uuid: uuid,
                type: 'tiled-map',
                name: Path.basename(fsPath),
                selected: true,
                fspath: fsPath,
                icon: Utils.getIcon(uuid)
            };

            if (callback) {
                callback(itemInfo);
            }
        }
    }
};

