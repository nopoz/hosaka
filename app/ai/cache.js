const store = new Map();

function key({ id, current, target, model }) {
    return `${id}|${current}|${target}|${model}`;
}

function get(cacheKey) {
    return store.get(cacheKey);
}

function set(cacheKey, value) {
    store.set(cacheKey, value);
}

function clear() {
    store.clear();
}

module.exports = {
    key,
    get,
    set,
    clear,
};
