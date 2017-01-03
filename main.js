'use strict';

module.exports = {
    load: function () {},
    unload: function () {},
    messages: {
        open () {
            Editor.Panel.open('pack-scene-asset');
            Editor.Metrics.trackEvent({
                category: 'Packages',
                label: 'pack-scene-asset',
                action: 'Panel Open'
            }, null);
        }
    }
};