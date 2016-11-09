'use strict';

exports.template = `

    <div id="bar"></div>
    <div class="wrapper" v-if="reslist && reslist.length > 0" @dblclick="_onDbFoldClick">
        <i id="foldIcon" v-el:foldIcon v-bind:class="_foldIconClass(folded)" @click="_onFoldClick"></i>
        <img src="packages://assets/static/icon/folder.png">
        <span> {{name}} </span>
    </div>
    <div class="item-content" v-for="item in reslist" v-show="folded">
        <div class="item layout horizontal content"
             @dblclick="_onDbFoldItemClick(item.uuid)">
            <ui-checkbox class="item-checkbox" v-value="item.selected"></ui-checkbox>
            <img class="item-img" :src=item.icon>
            <p class="item-name">{{item.name}}</p>
        </div>
    </div>
`;

exports.props = ['name', 'reslist', 'folded'];

exports.methods = {

    _foldIconClass: function ( folded ) {
        if ( folded )
            return 'fa fa-caret-down';

        return 'fa fa-caret-right';
    },

    _onDbFoldItemClick (uuid) {
        event.stopPropagation();
        Editor.Ipc.sendToAll('assets:hint', uuid);
    },

    _onFoldClick ( event ) {
        event.stopPropagation();
        if ( event.which !== 1 ) {
            return;
        }
        this.folded = !this.folded;
        this.$parent._changedResItemFoldedState();
    },

    _onDbFoldClick ( event ) {
        event.stopPropagation();
        if ( event.which !== 1 ) {
            return;
        }
        this.folded = !this.folded;
        this.$parent._changedResItemFoldedState();
    }

};
