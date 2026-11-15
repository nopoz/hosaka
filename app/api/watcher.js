const registry = require('../registry');
const component = require('./component');

/**
 * Return registered watchers.
 * @returns {{id: string}[]}
 */
function getWatchers() {
    return registry.getState().watcher;
}

function getUnreachableWatcherNames() {
    return new Set(Object.values(getWatchers())
        .filter((watcher) => watcher.getStatus && !watcher.getStatus().reachable)
        .map((watcher) => watcher.name));
}

/**
 * Init Router.
 * @returns {*}
 */
function init() {
    return component.init(getWatchers);
}

/**
 * Get all watchers.
 * @returns {{id: string}[]}
 */
function getAllWatchers() {
    return component.mapComponentsToList(getWatchers);
}

module.exports = {
    init,
    getAllWatchers,
    getUnreachableWatcherNames,
};
