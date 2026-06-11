const log = require('../log').child({ component: 'store' });
const { getContainers, deleteContainer, updateContainer } = require('./container');

/**
 * Migrate from legacy unknown version.
 */
function migrateFromUndefined() {
    getContainers({}).forEach((container) => deleteContainer(container.id));
}

/**
 * Add displayName & displayIcon if missing.
 */
function addDisplayNameAndIcon() {
    getContainers({}).forEach((container) => {
        const containerMigrated = {
            ...container,
        };
        if (container.displayName === undefined) {
            containerMigrated.displayName = container.name;
        }
        if (container.displayIcon === undefined) {
            containerMigrated.displayIcon = 'ri:box-3-line';
        }
        updateContainer(containerMigrated);
    });
}

/**
 * Replace the legacy default display icon (mdi:docker) with the current Remix
 * default so existing container rows pick it up on upgrade. Containers that set
 * mdi:docker explicitly via the display.icon label get it reapplied on the next
 * watch cycle (the label is authoritative), so this only permanently affects
 * rows that were left on the old default.
 */
function replaceLegacyDefaultIcon() {
    getContainers({}).forEach((container) => {
        if (container.displayIcon === 'mdi:docker') {
            updateContainer({
                ...container,
                displayIcon: 'ri:box-3-line',
            });
        }
    });
}

/**
 * Data migration function.
 * @param from version
 * @param to version
 */
function migrate(from, to) {
    log.info(`Migrate data from version ${from} to version ${to}`);
    if (from === undefined) {
        migrateFromUndefined();
    }

    addDisplayNameAndIcon();
    replaceLegacyDefaultIcon();
}

module.exports = {
    migrate,
};
