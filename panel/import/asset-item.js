'use strict';

exports.template = `

<div>
    <div class="wrapper" @dblclick="_onDbFoldClick">
        <i id="foldIcon" v-el:foldIcon v-bind:class="_foldIconClass()" @dblclick="_onStopDefault" @click="_onFoldClick"></i>
        <ui-checkbox class="item-checkbox" :value="filetree ? filetree.selected : true" v-on:confirm="_onDirectorySelectClick"></ui-checkbox>
        <img class="icon" src="packages://assets/static/icon/folder.png">
        <span> {{filetree ? filetree.name : ''}} </span>
    </div>

    <div class="item-content" v-show="_folded()" v-for="item in filetree ? filetree.children : []">
        <div v-if="!_isDirectory(item)" class="item layout horizontal content">
            <ui-checkbox class="item-checkbox" :value="item.selected"></ui-checkbox>
            <img class="item-img" :src='item.icon'>
            <p class="item-name">{{item.name}}</p>
        </div>
        <package-import-asset-item v-if="_isDirectory(item)" v-bind:fileTree="item"></package-import-asset-item>
    </div>
</div>

`;

exports.props = ['filetree'];

exports.created = function () {
    this._clickCheckbox = false;
};

exports.methods = {

    // 统一修改一个文件下的所以资源的选择状态
    _setFileSelectd: function (fileTree, val) {
        fileTree.selected = val;
        fileTree.children && fileTree.children.forEach((file)=>{
            this._setFileSelectd(file, val);
        });
    },

    _onDirectorySelectClick: function (event) {
        event.stopPropagation();
        this._clickCheckbox = true;
        this._setFileSelectd(this.filetree, event.detail.value);
    },

    _folded () {
        return this.filetree ? this.filetree.folded : true;
    },

    _isDirectory (item) {
        return item.type === 'directory';
    },

    _foldIconClass () {
        if (this.filetree && this.filetree.folded)
            return 'fa fa-caret-down';

        return 'fa fa-caret-right';
    },

    _clickFold (event) {
        this._onStopDefault(event);
        this.filetree.folded = !this.filetree.folded;
        this.$root._changedFileTreeFoldedState();
    },

    _onFoldClick (event) {
        this._clickCheckbox = false;
        this._clickFold(event);
    },

    _onStopDefault (event) {
        event.stopPropagation();
        event.preventDefault();
    },

    _onDbFoldClick (event) {
        if (this._clickCheckbox) {
            return;
        }
        this._clickFold(event);
    }
};
