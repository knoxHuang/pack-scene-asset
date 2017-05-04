const Electron = require('electron');
const dialog = Electron.remote.dialog;

exports.ASSET_TYPE = '&asset&type&.json';

exports.init = function (profiles) {
    this.localProfiles = profiles.local;
};

exports.getDataByKey = function (key) {
    return this.localProfiles.data[key] || '';
};

exports.save = function (key, value) {
    this.localProfiles.data[key] = value;
    this.localProfiles.save();
};

exports.showErrorMessageBox = function (title, content) {
    dialog.showErrorBox(title, content);
};

exports.showImportMessageBox = function (title, message, callback) {
    dialog.showMessageBox({
        type: 'info',
        title: title,
        message: message,
        buttons: [Editor.T('MESSAGE.yes'), Editor.T('MESSAGE.no')]
    }, (index) => {
        // index = 0 是，1 = 否
        callback && callback(null, index === 0);
    });
};

exports.showImportZipDialog = function (callback) {
    let ext = 'zip';
    dialog.showOpenDialog(
        {
            defaultPath: this.localProfiles.data['import-folder-path'] || Editor.projectInfo.path,
            properties: ['openFile'],
            filters: [{
                name: ext,
                extensions: [ext.toLowerCase()]
            }]
        },
        (paths) => {
            if (!callback || !paths) {
                return;
            }
            let savePath = paths[0];
            callback(null, savePath);
            this.save('import-folder-path', savePath);
        }
    );
};

exports.showImportOutPathDialog = function (callback) {
    dialog.showOpenDialog(
        {
            defaultPath: this.localProfiles.data['out-path'] || Editor.projectInfo.path + '\\assets\\',
            properties: ['openDirectory']
        },
        (paths) => {
            if (!callback || !paths) {
                return;
            }
            let outPath = paths[0] + '\\';
            callback(null, outPath);
            this.save('out-path', outPath);
        }
    );
};

exports.showExportResDialog = function (callback) {
    dialog.showOpenDialog(
        {
            defaultPath: this.localProfiles.data['current-resource'] || Editor.projectInfo.path,
            properties: ['openFile'],
            filters: [
                {
                    name: 'resource',
                    extensions: ['fire', 'prefab']
                }
            ]
        },
        (paths) => {
            if (!callback || !paths) {
                return;
            }
            let path = paths[0];
            let meta = Editor.assetdb.remote.loadMetaByPath(path);
            callback(null, {
                path: path,
                uuid: meta.uuid
            });
            this.save('current-resource', path);
        }
    );
};

exports.showExportOutPathDialog = function (callback) {
    let path = this.localProfiles.data['export-resource-path'] || Editor.projectInfo.path;
    let savePath = dialog.showSaveDialog(
        {
            title: Editor.T('EXPORT_ASSET.title'),
            defaultPath: path,
            filters: [
                //{ name: 'All Files', extensions: ['*'] }
                { name: 'Package', extensions: ['zip'] }
            ]
        }
    );

    if ( savePath ) {
        callback(null, savePath);
        this.save('export-resource-path', savePath);
    }
};

exports.isDirectory = function (path) {
    return Fs.existsSync(path);
};

exports.copyFolder = function (dst) {
    if (!Fs.existsSync(dst)) {
        Fs.mkdirSync(dst);
    }
};

exports.copyFile = function (src, dst) {
    let readStream = Fs.createReadStream(src);
    let writeStream = Fs.createWriteStream(dst);
    let stat = Fs.statSync(src);

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

exports.getIcon = function (uuid) {
    let meta = Editor.assetdb.remote.loadMetaByUuid(uuid);
    let assetType = meta.assetType();
    if (assetType === 'texture') {
        return `thumbnail://${uuid}?32`;
    }
    else if (assetType === 'sprite-frame') {
        return `thumbnail://${meta.rawTextureUuid}?32`;
    }
    else if (assetType === 'dragonbones') {
        assetType = 'spine'
    }
    return 'unpack://static/icon/assets/' + assetType + '.png';
};