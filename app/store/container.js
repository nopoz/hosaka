/**
 * Container store.
 */
const { isDeepStrictEqual } = require('util');
const { byString, byValues } = require('sort-es');
const log = require('../log').child({ component: 'store' });
const { validate: validateContainer } = require('../model/container');
const {
    emitContainerAdded,
    emitContainerUpdated,
    emitContainerRemoved,
} = require('../event');

let containers;

/**
 * How long a "success" notification is kept before it is considered stale.
 * Success notifications are transient UI feedback for a completed update; they
 * must not linger (or pin store rows) indefinitely.
 */
const SUCCESS_NOTIFICATION_TTL_MS = 10 * 60 * 1000;

/**
 * Drop stale success notifications from a container (mutates in place).
 * Legacy success notifications without a timestamp are treated as stale.
 * @param {Object} container
 * @returns {Object} the same container
 */
function clearStaleNotification(container) {
    const { notification } = container;
    if (notification && notification.level === 'success') {
        const age = notification.timestamp
            ? Date.now() - notification.timestamp
            : Number.POSITIVE_INFINITY;
        if (age > SUCCESS_NOTIFICATION_TTL_MS) {
            // eslint-disable-next-line no-param-reassign
            delete container.notification;
        }
    }
    return container;
}

/**
 * Create container collections.
 * @param db
 */
function createCollections(db) {
    containers = db.getCollection('containers');
    if (containers === null) {
        log.info('Create Collection containers');
        containers = db.addCollection('containers');
    }
}

/**
 * Insert new Container.
 * @param container
 */
function insertContainer(container) {
    const containerToSave = validateContainer(container);
    containers.insert({
        data: containerToSave,
    });
    emitContainerAdded(containerToSave);
    return containerToSave;
}

/**
 * Update existing container.
 * @param container
 */
function updateContainer(container) {
    const containerToReturn = validateContainer(container);

    // Remove any existing containers with same name/watcher combo but different ID
    const existingContainers = containers.chain()
        .find({
            'data.name': container.name,
            'data.watcher': container.watcher
        })
        .data();

    let removedStaleDuplicate = false;
    for (const existing of existingContainers) {
        if (existing.data.id !== container.id) {
            console.log(`Removing old container record ${existing.data.id} for ${container.name}`);
            containers.remove(existing);
            removedStaleDuplicate = true;
        }
    }

    // Now update/insert the new container
    const existingContainer = containers.findOne({ 'data.id': container.id });

    // The watch loop re-saves every container each cycle even when nothing
    // changed. Only emit an "updated" event when the persisted state actually
    // differs from the stored row, otherwise SSE clients are flooded with no-op
    // updates. The validated container is the persisted state (its computed
    // getters compare by value), so a deep compare detects real changes.
    const changed = removedStaleDuplicate
        || !existingContainer
        || !isDeepStrictEqual(existingContainer.data, containerToReturn);

    if (existingContainer) {
        containers.chain().find({ 'data.id': container.id }).remove();
    }

    containers.insert({ data: containerToReturn });
    if (changed) {
        emitContainerUpdated(containerToReturn);
    }
    return containerToReturn;
}

/**
 * Get all (filtered) containers.
 *
 * The store is authoritative per watcher (reconciled each watch cycle), so it
 * holds exactly one row per running container. No name-based deduplication is
 * performed here; doing so could surface a stale row over the live one.
 * @param {Object} query
 * @returns {Array}
 */
function getContainers(query = {}) {
    const filter = {};
    Object.keys(query).forEach((key) => {
        filter[`data.${key}`] = query[key];
    });

    if (!containers) {
        return [];
    }

    // Get, validate and drop stale success notifications
    const containerList = containers
        .find(filter)
        .map((item) => clearStaleNotification(validateContainer(item.data)));

    return containerList.sort(
        byValues([
            [(container) => container.watcher, byString()],
            [(container) => container.image.registry.name, byString()],
            [(container) => container.name, byString()],
            [(container) => container.image.tag.value, byString()],
        ]),
    );
}

/**
 * Get container by id.
 * @param id
 * @returns {null|Image}
 */
function getContainer(id) {
    const container = containers.findOne({
        'data.id': id,
    });

    if (container !== null) {
        return clearStaleNotification(validateContainer(container.data));
    }
    return undefined;
}

/**
 * Delete container by id.
 * @param id
 */
function deleteContainer(id) {
    const container = getContainer(id);
    if (container) {
        console.log(`Attempting to delete container: ${id}`);
        containers.chain().find({ 'data.id': id }).remove();
        emitContainerRemoved(container);
        // Verify removal
        const stillExists = getContainer(id);
        if (stillExists) {
            console.warn(`Container ${id} still exists after deletion attempt.`);
        } else {
            console.log(`Container ${id} deleted successfully.`);
        }
    } else {
        console.warn(`Container ${id} not found for deletion.`);
    }
}

module.exports = {
    createCollections,
    insertContainer,
    updateContainer,
    getContainers,
    getContainer,
    deleteContainer,
};
