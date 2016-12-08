const Electron = require('electron');
const dialog = Electron.remote.dialog;

var localProfiles;
exports.init = function (profiles) {
    return localProfiles = profiles.local;
};

exports.getLocalProfile = function () {
    return localProfiles;
};

exports.saveLocalProfile = function (key, value) {
    localProfiles[key] = value;
    localProfiles.save();
};

exports.showChooseSceneDialog = function (callback) {
    var ext = 'fire';
    dialog.showOpenDialog(
        {
            defaultPath: localProfiles['current-scene'] || Editor.projectInfo.path,
            properties: ['openFile'],
            filters: [{
                name: ext,
                extensions: [ext.toLowerCase()]
            }]
        },
        (fsPath) => {
            if (!callback || !fsPath) {
                return;
            }
            var meta = Editor.assetdb.remote.loadMetaByPath(fsPath);
            callback({
                fspath: fsPath[0],
                uuid: meta.uuid
            });
            this.saveLocalProfile('current-scene', fsPath[0]);
        }
    );
};

exports.showExportResDialog = function (callback) {
    var path = localProfiles['export-resource-path'] || Editor.projectInfo.path;
    var svaePath = dialog.showSaveDialog(
        {
            title: '导出资源',
            defaultPath: path,
            filters: [
                { name: 'Package', extensions: ['zip'] }
            ]
        }
    );
    if ( svaePath ) {
        callback(svaePath);
        this.saveLocalProfile('export-resource-path', svaePath);
    }
};

exports.getIcon = function (uuid) {
    var meta = Editor.assetdb.remote.loadMetaByUuid(uuid);
    var assetType = meta.assetType();
    if (assetType === "texture") {
        return `thumbnail://${uuid}?32`;
    }
    else if (assetType === "sprite-frame") {
        return `thumbnail://${meta.rawTextureUuid}?32`;
    }
    else if (assetType === 'dragonbones') {
        assetType = 'spine'
    }
    return "unpack://static/icon/assets/" + assetType + ".png";
};

// 拷贝文件
exports.copyFile = function (src, dst) {
    var readStream = Fs.createReadStream(src);
    var writeStream = Fs.createWriteStream(dst);
    var stat = Fs.statSync(src);

    readStream.on('data', function (chunk) {
        if (writeStream.write(chunk) === false) {
            readStream.pause();
        }
    });

    readStream.on('end', function () {
        writeStream.end();
    });

    writeStream.on('drain', function () {
        readStream.resume();
    });
};