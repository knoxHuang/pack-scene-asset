var Electron = require('electron');
var Fs = require('fire-fs');
var Path = require('fire-path');

var Utils = Editor.require('packages://package-asset/utils.js');
var Export = Editor.require('packages://package-asset/parse/export.js');
var Depend = Editor.require('packages://package-asset/parse/depend.js');
var JSZip = Editor.require('packages://package-asset/lib/jszip.min.js');
var jsZip = new JSZip();

let ASSET_ITEM =  Editor.require('packages://package-asset/panel/export/asset-item.js');

Vue.component('package-export-asset-item', ASSET_ITEM);

Editor.Panel.extend({

    style: Fs.readFileSync(Editor.url('packages://package-asset/panel/style.css')) + '',
    template: Fs.readFileSync(Editor.url('packages://package-asset/panel/export/panel.html')) + '',

    ready () {
        Utils.init(this.profiles);
        let vm = this._vm = new window.Vue({
            el: this.shadowRoot,

            created () {
                // this.assetUuid = '988a02bf-0b53-4709-a52a-9090224558bc';
            },

            data: {
                assetUuid: '',
                assetTree: null,
                foldedAll: Utils.getDataByKey('folded-all'),
                allAssets: []
            },

            watch: {
                assetUuid: {
                    handler (val) {
                        this.allAssets.length = 0;
                        if (!val) {
                            this.assetTree = null;
                            return;
                        }
                        this._queryDependAsset(val);
                    }
                }
            },

            methods: {

                T: Editor.T,

                // 显示进度条
                _showLoadBar () {
                    return this.assetUuid && !this.assetTree;
                },

                // 是否显示内容
                _showContent () {
                    return this.assetUuid && this.assetTree;
                },

                // 是否禁用
                _isDisabled () {
                    return this.assetUuid === '' || this.allAssets.length === 0;
                },

                // 设置是否展开
                _setAssetTreeFolded (assetTree, val) {
                    if (assetTree.folded !== undefined) {
                        assetTree.folded = val;
                    }
                    assetTree.children && assetTree.children.forEach((file) => {
                        if (file.type === 'directory') {
                            this._setAssetTreeFolded(file, val);
                        }
                    });
                },

                // 获取是否展开
                _getAssetTreeFolded (assetTree, self) {
                    if (assetTree.folded !== undefined && !assetTree.folded) {
                        self.foldedAll = false;
                        return;
                    }
                    assetTree.children && assetTree.children.forEach((file)=>{
                        if (file.type === 'directory') {
                            this._getAssetTreeFolded(file, self);
                        }
                    });
                },

                _changedAssetTreeFoldedState (val) {
                    if (val === undefined) {
                        this.foldedAll = true;
                        this._getAssetTreeFolded(this.assetTree, this);
                        return;
                    }
                    this._setAssetTreeFolded(this.assetTree, val);
                    this.foldedAll = val;
                },

                // 选择场景
                onChooseScene (event) {
                    Utils.showExportResDialog((err, data) => {
                        this.assetUuid = data.uuid;
                    });
                },

                // 获取 Asset 依赖的 uuid
                _queryDependAsset (uuid) {
                    Editor.Scene.callSceneScript('package-asset', 'query-depend-asset', uuid, (err, uuidList) => {
                        if (err) {
                            return;
                        }
                        Export.queryAssetTreeByUuidList(uuidList, (err, info) => {
                            this.assetTree = info.assetTree;
                            this.allAssets = info.allAssets;
                            this._setAssetTreeFolded(info.assetTree, this.foldedAll);
                        });
                    });
                },

                onRefresh (event) {
                    this._queryDependAsset(this.assetUuid);
                },

                // 修改资源
                onAssetChanged (event) {
                    this.assetUuid = event.detail.value;
                },

                onClearAll () {
                    this.assetUuid = '';
                },

                // 全部展开
                onFoldedAll (event) {
                    let value = event.detail.value;
                    this._changedAssetTreeFoldedState(value);
                    Utils.save('folded-all', value);
                },

                // 导出
                onExport () {
                    let folderList = [];
                    // 创建文件夹
                    function createDirectory (item) {
                        if (item.parent.name === 'Assets') {
                            let folder = jsZip.folder(item.name);
                            jsZip.file(item.name + ".meta", Fs.readFileSync(item.url + ".meta"));
                            folderList[item.name] = folder;
                            return folder;
                        }
                        else {
                            let parentFolder = folderList[item.parent.name];
                            if (!parentFolder) {
                                parentFolder = createDirectory(item.parent);
                                folderList[item.parent.name] = folder;
                                parentFolder.file(item.name + ".meta", Fs.readFileSync(item.url + ".meta"));
                            }
                            let folder = parentFolder.folder(item.name);
                            folderList[item.name] = folder;
                            return folder
                        }
                    }
                    // 文件
                    function createFile (item) {
                        if (item.parent.name === 'Assets') {
                            let file = jsZip.file(item.name, Fs.readFileSync(item.url));
                            jsZip.file(item.name + ".meta", Fs.readFileSync(item.url + ".meta"));
                        }
                        else {
                            let folder = folderList[item.parent.name];
                            if (!folder) {
                                folder = createDirectory(item.parent);
                            }
                            let file = folder.file(item.name, Fs.readFileSync(item.url));
                            folder.file(item.name + ".meta", Fs.readFileSync(item.url + ".meta"));
                        }
                    }

                    let config = {};
                    Utils.showExportOutPathDialog((err, outPath) => {
                        if (err) {
                            return;
                        }

                        let rootPath = Editor.projectInfo.path + '\\assets\\';
                        let path;
                        for (let i = 0; i < this.allAssets.length; ++i) {
                            let item = this.allAssets[i];
                            path = item.url.replace(rootPath, '');
                            if (item.type === 'directory') {
                                createDirectory(item);
                            }
                            else {
                                createFile(item);
                                config[item.name] = item.type;
                            }
                        }
                        let parsePath = Path.parse(outPath);
                        jsZip.file("&asset&type&.json", JSON.stringify(config));
                        jsZip.generateNodeStream({ type:"nodebuffer" })
                           .pipe(Fs.createWriteStream(outPath))
                           .on('finish', function () {
                                let outTips = Editor.T('EXPORT_ASSET.export_tips', {outPath: outPath});
                                Editor.log(outTips);
                           });

                        Electron.shell.showItemInFolder(outPath);
                    });
                }
            }
        });
    }
});
