const Electron = require('electron');
const dialog = Electron.remote.dialog;

var localProfiles;
exports.init = function (profiles) {
    localProfiles = profiles.local;
};

exports.showChooseSceneDialog = function (callback) {
    var ext = 'fire';
    dialog.showOpenDialog(
        {
            defaultPath: localProfiles["current-scene"] || Editor.projectInfo.path,
            properties: ['openFile'],
            filters: [{
                name: ext,
                extensions: [ext.toLowerCase()]
            }]
        },
        function (fsPath) {
            if (!callback || !fsPath) {
                return;
            }
            var meta = Editor.assetdb.remote.loadMetaByPath(fsPath);
            callback({
                fspath: fsPath[0],
                uuid: meta.uuid
            });
            localProfiles["current-scene"] = fsPath[0];
            localProfiles.save();
        }
    );
};


exports.showExportResDialog = function (callback) {
    var path = localProfiles['export-resource-path'] || Editor.projectInfo.path;
    dialog.showOpenDialog(
        {
            defaultPath: path,
            properties: ['openDirectory']
        },
        function (fsPath) {
            if (!callback || !fsPath) {
                return;
            }
            callback(fsPath[0]);
            localProfiles["export-resource-path"] = fsPath[0];
            localProfiles.save();
        }
    );
};

exports.getIcon = function (uuid) {
    var meta = Editor.assetdb.remote.loadMetaByUuid(uuid);
    if (meta.assetType() === "texture") {
        return `thumbnail://${uuid}?32`;
    }
    else if (meta.assetType() === "sprite-frame") {
        return `thumbnail://${meta.rawTextureUuid}?32`;
    }
    return "unpack://static/icon/assets/" + meta.assetType() + ".png";
};



exports.copyFile = function (src, dir) {
    var readStream = Fs.createReadStream(src);
    var writeStream = Fs.createWriteStream(dir);
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