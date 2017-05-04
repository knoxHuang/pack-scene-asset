var Electron = require('electron');
var Fs = require('fire-fs');
var Path = require('fire-path');

var Utils = Editor.require('packages://package-asset/utils.js');
var Import = Editor.require('packages://package-asset/parse/import.js');
var JSZipUtils = Editor.require('packages://package-asset/lib/jszip-utils.min.js');
var JSZip = Editor.require('packages://package-asset/lib/jszip.min.js');
var jsZip = new JSZip();

let ASSET_ITEM =  Editor.require('packages://package-asset/panel/import/asset-item.js');

Vue.component('package-import-asset-item', ASSET_ITEM);

Editor.Panel.extend({

    style: Fs.readFileSync(Editor.url('packages://package-asset/panel/style.css')) + '',
    template: Fs.readFileSync(Editor.url('packages://package-asset/panel/import/panel.html')) + '',

    ready () {
        Utils.init(this.profiles);
        let vm = this._vm = new window.Vue({
            el: this.shadowRoot,

            created () {
                this.metaList = [];
                this.outPath = Utils.getDataByKey('out-path');
                this.folderPath = Utils.getDataByKey('import-folder-path');
                this._lastfolderPath = '';
            },

            data: {
                outPath: '',
                folderPath: '',
                filetree: [],
                foldedAll: true,
                progress: 0,
                progressState: Editor.T('IMPORT_ASSET.progress_state_wait')
            },

            watch: {
                folderPath: {
                    handler (val) {
                        Utils.save('import-folder-path', val);
                        if (!val) {
                            this.filetree = null;
                            this.progressState = Editor.T('IMPORT_ASSET.progress_state_wait');
                            return;
                        }
                        console.time();
                        Import.onFolderParse(val, (data) => {
                            console.timeEnd();
                            if (!data) {
                                this.folderPath = this._lastfolderPath;
                                return;
                            }
                            this.filetree = data.fileTree;
                            this.metaList = data.metaList;
                            this.progressState = Editor.T('IMPORT_ASSET.progress_state_ready');
                        });
                    }
                },
                outPath: {
                    handler (val) {
                        Utils.save('out-path', val);
                    }
                }
            },

            methods: {

                T: Editor.T,

                // 是否禁用
                _isDisabled () {
                    return this.folderPath === '' || this.outPath === '';
                },

                // 设置是否展开
                _setFileTreeFolded (fileTree, val) {
                    if (fileTree.folded !== undefined) {
                        fileTree.folded = val;
                    }
                    fileTree.children && fileTree.children.forEach((file) => {
                        if (file.type === 'directory') {
                            this._setFileTreeFolded(file, val);
                        }
                    });
                },

                // 获取是否展开
                _getFileTreeFolded (fileTree, self) {
                    if (fileTree.folded !== undefined && !fileTree.folded) {
                        self.foldedAll = false;
                        return;
                    }
                    fileTree.children && fileTree.children.forEach((file)=>{
                        if (file.type === 'directory') {
                            this._getFileTreeFolded(file, self);
                        }
                    });
                },

                _changedFileTreeFoldedState (val) {
                    if (val === undefined) {
                        this.foldedAll = true;
                        this._getFileTreeFolded(this.filetree, this);
                        return;
                    }
                    this._setFileTreeFolded(this.filetree, val);
                    this.foldedAll = val;
                },

                // 选择 zip 文件
                onChooseImportFolder (event) {
                    Utils.showImportZipDialog((err, path) => {
                        this._lastfolderPath = this.folderPath;
                        this.folderPath = path;
                    });
                },

                // 需要导入的目标文件
                onChooseOutFolder (event) {
                    Utils.showImportOutPathDialog((err, path) => {
                        this.outPath = path;
                    });
                },

                onClearAll () {
                    this.progress = 0;
                    this.folderPath = '';
                },

                onClearOutPath () {
                    this.outPath = '';
                },

                _updateProgress (idx, total, file) {
                    let isDir = file.dir ? Editor.T('IMPORT_ASSET.folder') : Editor.T('IMPORT_ASSET.file');
                    let outStrLog = Editor.T('IMPORT_ASSET.progress_state_import', { name: isDir + file.name, outPath: this.outPath });
                    Editor.log(outStrLog);
                    this.progress = 100 * (idx / total);
                    this.progressState = outStrLog;
                    if (idx >= total) {
                        Editor.assetdb.refresh('db://assets/');
                        this.progressState = Editor.T('IMPORT_ASSET.progress_state_end');
                    }
                },

                _import () {
                    this.progressState = Editor.T('IMPORT_ASSET.progress_state_start');
                    this.progress = 0;
                    JSZipUtils.getBinaryContent(this.folderPath, (err, data) => {
                        if (err) {
                            throw err;
                        }
                        JSZip.loadAsync(data).then((zip) => {
                            let total = Object.keys(zip.files).length;
                            let idx = 1;
                            for (let key in zip.files) {
                                let file = zip.files[key];
                                if (file.name === Utils.ASSET_TYPE) {
                                    continue;
                                }
                                let fileInfo = Path.parse(file.name);
                                Utils.copyFolder(this.outPath + fileInfo.dir);
                                if (!file.dir) {
                                    file.nodeStream()
                                        .pipe(Fs.createWriteStream(this.outPath + file.name))
                                        .on('finish', () => {
                                            idx++;
                                            this._updateProgress(idx, total, file);
                                        });
                                }
                                else {
                                    idx++;
                                    this._updateProgress(idx, total, file);
                                }
                            }
                        });
                    });
                },


                _chackMeta () {
                    let parseRootPath = Path.parse(this.outPath);
                    let msg = '';
                    let result = true;
                    this.metaList.forEach((info)=> {
                        let uuid = info.meta.uuid;
                        // 目标项目中相同 uuid 的路径
                        let oldPath = Editor.remote.assetdb._uuid2path[uuid];
                        if (oldPath) {
                            oldPath = Path.normalize(oldPath.replace(Editor.projectInfo.path + '\\', ''));
                            let newPath = Path.normalize(parseRootPath.name + '\\' + info.path);
                            if (oldPath !== newPath) {
                                msg += (Path.normalize(info.path) + '\n');
                                result = false;
                            }
                        }
                    });
                    return {
                        result: result,
                        msg: msg
                    }
                },

                // 导入
                onImport () {
                    // 不存在文件夹就报错
                    if (!Fs.existsSync(this.outPath)) {
                        Utils.showErrorMessageBox(Editor.T('IMPORT_ASSET.err_title'), Editor.T('IMPORT_ASSET.err_info_not_exist', {outPath: this.outPath}));
                        return;
                    }
                    // 导入的资源和项目中原有资源 uuid 相同，无法完成导入
                    // 除非路径相同
                    let info = this._chackMeta();
                    if (!info.result) {
                        Utils.showErrorMessageBox(Editor.T('IMPORT_ASSET.err_title'), Editor.T('IMPORT_ASSET.err_info_repeat_asset', {msg: info.msg}));
                        return;
                    }

                    Utils.showImportMessageBox(Editor.T('IMPORT_ASSET.confirmation_box_title'), Editor.T('IMPORT_ASSET.confirmation_box_content', {outPath: this.outPath}),(err, result) => {
                        if (result) {
                            this._import();
                        }
                    });
                }
            }
        });
    }
});


