/**
 * 资源类型枚举
 */
var ResType = cc.Enum({
    Resource: -1,
    AnimClip: -1,
    AudioClip: -1,
    Font: -1,
    Script: -1,
    Prefab: -1,
    Particle: -1,
    Spine: -1,
    DragonBones: -1,
    Other: -1,
    Scene: -1,
});

// 该路径是 Cocos Creator 默认资源路径
var FILTERPATH = "editor\\static\\default-assets";

var getResType = function (type) {
    switch (type) {
        case 'texture':
        case 'texture-packer':
        case 'sprite-frame':
        case 'sprite-atlas':
        case 'auto-atlas':
        case 'custom-asset':
            return ResType.Resource;
        case 'animation-clip':
            return ResType.AnimClip;
        case 'audio-clip':
            return ResType.AudioClip;
        case 'bitmap-font':
        case 'ttf-font':
        case 'text':
        case 'markdown':
            return ResType.Font;
        case 'javascript':
        case 'coffeescript':
            return ResType.Script;
        case 'prefab':
            return ResType.Prefab;
        case 'particle':
            return ResType.Particle;
        case 'scene':
            return ResType.Scene;
        case 'spine':
            return ResType.Spine;
        case 'dragonbones':
        case 'dragonbones-atlas':
        case 'dragonbones-atlas-png':
            return ResType.DragonBones;
        default:
            return ResType.Other
    }
};

module.exports = {
    FILTERPATH: FILTERPATH,
    ResType: ResType,
    getResType: getResType
};