const Fs = require('fire-fs');
const Url = require('fire-url');
const Path = require('fire-path');
const Async = require('async');
const Depend = require('./parse/depend');

let getClassById = cc.js._getClassById;
let library = Editor.remote.importPath;
let deserializeDetails = new cc.deserialize.Details();

module.exports = {

    _queryDependAsset (uuid, visitedUuids, callback) {

        // 判断是否是内置资源，如果是则不需要导出
        let url = Editor.remote.assetdb.uuidToUrl(uuid);
        if (url.indexOf(Depend.INTERNAL) !== -1) {
            return callback(); 
        }
        
        let visited = visitedUuids[uuid];
        if (visited) {
            return callback(); 
        }

        // 如果有依赖的 subAsset，应该导出 mainAsset
        let isSubAsset = Editor.remote.assetdb.isSubAssetByUuid(uuid);
        if (isSubAsset) {
            let url = Editor.remote.assetdb.uuidToUrl(uuid);
            let mainUrl = Url.dirname(url);
            let mainUuid = Editor.remote.assetdb.urlToUuid(mainUrl);
            let visited = visitedUuids[mainUuid];
            if (!visited) {
                visitedUuids[mainUuid] = true;
            }
            Depend.queryDependsOfRawAssetByUrl(mainUrl, (err, results) => {
                Async.each(results, (result, next) => {
                    this._queryDependAsset(result.uuid, visitedUuids, next);
                }, callback);
            });
            return;
        }

        visitedUuids[uuid] = true;

        Editor.assetdb.queryInfoByUuid(uuid, (err, info) => {
            deserializeDetails.reset();

            let ctor = Editor.assets[info.type];
            let isRaw = !ctor || cc.RawAsset.isRawAssetType(ctor);

            // 获取 Raw Asset 的依赖资源
            if (isRaw) {
                Depend.queryDependsOfRawAssetByUrl(info.url, (err, results) => {
                    Async.each(results, (result, next) => {
                        this._queryDependAsset(result.uuid, visitedUuids, next);
                    }, callback);
                });
                return;
            }

            // 获取赖脚本资源
            if (Depend.isScript(info.type)) {
                Depend.queryDependScriptByUuid(info.uuid, (err, spUuidList) => {
                    Async.each(spUuidList, (spUuid, next) => {
                        visited = visitedUuids[spUuid];
                        if (!visited) {
                            visitedUuids[spUuid] = true;
                        }
                        next();
                    }, callback);
                });
                return;
            }

            let relative = uuid.slice(0, 2) + Path.sep + uuid + '.json';
            let src = Path.join(library, relative);
            let buffer = Fs.readFileSync(src);
            cc.deserialize(buffer, deserializeDetails, {
                classFinder: function (id) {

                    if (Editor.Utils.UuidUtils.isUuid(id)) {
                        let scriptUuid = Editor.Utils.UuidUtils.decompressUuid(id);
                        deserializeDetails.uuidList.push(scriptUuid);
                    }

                    let cls = getClassById(id);
                    if (cls) {
                        return cls;
                    }
                    return null;
                }
            });

            if (deserializeDetails.uuidList.length === 0) {
                callback();
            }
            else {
                Async.each(deserializeDetails.uuidList, (uuid, next) => {
                    this._queryDependAsset(uuid, visitedUuids, next);
                }, callback);
            }
        });
        
    },

    queryDependAsset (uuid, callback) {
        let visitedUuids = [];
        this._queryDependAsset(uuid, visitedUuids, () => {
            callback(null, Object.keys(visitedUuids));
        });
    },

    'query-depend-asset' (event, uuid) {
        this.queryDependAsset(uuid, (err, uuids) => {
            event.reply && event.reply(null, uuids);
        });
    }
};