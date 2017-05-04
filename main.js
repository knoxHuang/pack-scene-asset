'use strict';

module.exports = {
    load: function () {},

    unload: function () {},

    messages: {
        export () {
            Editor.Panel.open('package-asset.export');
            Editor.Metrics.trackEvent({
                category: 'Packages',
                label: 'package-asset',
                action: 'Export Asset'
            }, null);
        },

        import () {
            Editor.Panel.open('package-asset.import');
            Editor.Metrics.trackEvent({
                category: 'Packages',
                label: 'package-asset',
                action: 'Import Asset'
            }, null);
        }
    }
};