
var Define = Editor.require('packages://cocos-package/define.js');
var Utils = Editor.require('packages://cocos-package/utils.js');
var Fs = require("fire-fs");
var Path = require("fire-path");
var Detective = require('detective');

var Item =  Editor.require('packages://cocos-package/panel/item.js');


var uuidlist = [];
var getUuidAll = function (data) {
    var value, uuid;
    for (var key in data) {
        value = data[key];
        // 获取资源 uuid
        if (key === "__uuid__" && uuidlist.indexOf(value) === -1) {
            uuidlist.push(value);
            // 获取 texture uuid (bitmap font 资源)
            var meta = Editor.assetdb.remote.loadMetaByUuid(value);
            var textureUuid = meta['textureUuid'];
            if (textureUuid && uuidlist.indexOf(textureUuid) === -1) {
                uuidlist.push(textureUuid);
            }
        }
        // 获取脚本 uuid
        else if (key === "__type__" && Editor.UuidUtils.isUuid(value)) {
            uuid = Editor.UuidUtils.decompressUuid(value);
            if (uuidlist.indexOf(uuid) === -1) {
                uuidlist.push(uuid);
            }
        }
        else {
            if (typeof value === 'object') {
                getUuidAll(value);
            }
        }
    }
};

var findDependJS = function (fspath, callback) {
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

var parseScene = function (sceneUuid, callback) {
    uuidlist.push(sceneUuid);
    Editor.assetdb.queryInfoByUuid(sceneUuid, (err, asset) => {
        if (err) { return; }

        var sceneConfig = JSON.parse(Fs.readFileSync(asset.path, 'utf-8'));
        getUuidAll(sceneConfig);

        var uuid, meta, faPath;
        for (var i = 0; i < uuidlist.length; ++i) {
            Editor.assetdb.queryInfoByUuid(uuidlist[i], (err, asset) => {
                if (err) { return; }

                uuid = asset.uuid;
                faPath = asset.path;

                if (asset.type === "sprite-frame") {
                    meta = Editor.assetdb.remote.loadMetaByUuid(uuid);
                    faPath = Editor.assetdb.remote.uuidToFspath(meta.rawTextureUuid);
                }
                else if (asset.type === "javascript") {
                    findDependJS(faPath, callback);
                }

                // 判断是否是内置资源，如果是就不需要导出
                var builtIn = faPath.indexOf(Define.FILTERPATH) !== -1;
                if (builtIn) { return; }

                var itemInfo = {
                    uuid: uuid,
                    type: asset.type,
                    name: Path.basename(faPath),
                    selected: true,
                    fspath: faPath,
                    icon: Utils.getIcon(uuid)
                };

                if (callback) {
                    callback(itemInfo);
                }
            });
        }
    });
};

var addAllResList = function (allResList, itemInfo) {
    var allRes = allResList[Define.getResType(itemInfo.type)];

    if (!allRes || allRes.reslist.indexOf(itemInfo) !== -1) {
        return;
    }

    var hasContain = false;
    for (var i = 0; i < allRes.reslist.length; ++i) {
        if (allRes.reslist[i].uuid === itemInfo.uuid) {
            hasContain = true;
        }
    }

    if (!hasContain) {
        allRes.reslist.push(itemInfo);
    }
};

Editor.Panel.extend({

    style: Fs.readFileSync(Editor.url('packages://cocos-package/panel/style.css')) + '',
    template: Fs.readFileSync(Editor.url('packages://cocos-package/panel/panel.html')) + '',

    messages: {},

    ready () {
        Utils.init(this.profiles);
        var vm = this._vm = new window.Vue({
            el: this.shadowRoot,
            data: {
                sceneUUid: "d13475c7-b37e-45d6-b6c5-25929e8a0925",
                itemList: [],
                allResList: [],
                selectAll: false,
                foldedAll: false
            },

            watch: {
                itemList: {
                    handler (val) {
                        this._changedResItemSelectState();
                        this._changedResItemFoldedState();
                    }
                }
            },

            components: {
                "asset-item": Item
            },

            methods: {
                // 设置资源项的选择状态，如果未传入数值就检测是否是全选状态
                _changedResItemSelectState (val) {
                    if (val === undefined) {
                        this.selectAll = this.itemList.length > 0 &&
                            this.itemList.every((item) => { return item.selected; });

                        return;
                    }
                    for (var i = 0; i < this.itemList.length; ++i) {
                        this.itemList[i].selected = val;
                    }
                    this.selectAll = val;
                },

                // 设置资源项是否折叠状态，如果未传入数值就检测是否是折叠状态
                _changedResItemFoldedState (val) {
                    if (val === undefined) {
                        var folded = false;
                        for (var key in this.allResList) {
                            var item = this.allResList[key];
                            if (item.folded && item.reslist.length > 0) {
                                folded = true;
                                break;
                            }
                        }
                        this.foldedAll = folded;
                        return;
                    }
                    for (var i = 0; i < this.allResList.length; ++i) {
                        this.allResList[i].folded = val;
                    }
                    this.foldedAll = val;
                },

                _initAllResList () {
                    for (var k in Define.ResType) {
                        var info = {
                            name: k,
                            folded: true,
                            reslist: []
                        };
                        this.allResList.push(info);
                    }
                },

                // 获取当前所选择的场景
                onApplyScene (event) {
                    this.sceneUUid = event.detail.value;
                },

                // 是否全选资源
                onSelectedAll (event) {
                    var val = event.detail.value;
                    this._changedResItemSelectState(val);
                },

                // 是否展开全部资源
                onFoldedAll (event) {
                    var val = event.detail.value;
                    this._changedResItemFoldedState(val);
                },

                // 清空列表中的所有资源
                onClearAll (event) {
                    uuidlist = [];
                    this.itemList = [];
                    this.allResList = [];
                    this.selectAll = false;
                    this.foldedAll = false;
                },

                // 解析场景中的资源并且添加到列表中
                onParse (event) {
                    this.onClearAll();
                    this._initAllResList();
                    parseScene(this.sceneUUid, (itemInfo) => {
                        if (this.itemList.indexOf(itemInfo) === -1) {
                            this.itemList.push(itemInfo);
                        }
                        addAllResList(this.allResList, itemInfo);
                    });
                },

                onChooseScene (event) {
                    Utils.showChooseSceneDialog((info) => {
                        this.sceneUUid = info.uuid;
                    });
                },

                onExport (event) {
                    Utils.showExportResDialog((path) => {
                        for (var i = 0; i < this.itemList.length; ++i) {
                            var item = this.itemList[i];
                            Utils.copyFile(item.fspath, path + "/" + item.name);
                            Utils.copyFile(item.fspath + ".meta", path + "/" + item.name + ".meta");
                        }
                    });
                }

            }
        });
    }
});
