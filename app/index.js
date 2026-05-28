const { getVersion } = require('./configuration');
const log = require('./log');
const store = require('./store');
const registry = require('./registry');
const api = require('./api');
const prometheus = require('./prometheus');

/**
 * Gracefully shut down: stop watchers/triggers (no more writes), then flush the
 * store to disk so the last changes survive the restart, then exit.
 * @param signal
 */
async function shutdown(signal) {
    log.info(`Received ${signal}, shutting down`);
    try {
        await registry.deregisterAll();
    } catch (e) {
        log.warn(`Error during deregister (${e.message})`);
    }
    try {
        await store.flush();
    } catch (e) {
        log.warn(`Error during store flush (${e.message})`);
    }
    process.exit(0);
}

async function main() {
    log.info(`WUD is starting (version = ${getVersion()})`);

    // Init store
    await store.init();

    // Start Prometheus registry
    prometheus.init();

    // Init registry
    await registry.init();

    // Init api
    await api.init();

    // Gracefully exit when possible
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
}
main();
