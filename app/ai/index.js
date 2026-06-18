const { getAiConfiguration } = require('../configuration');
const { detectRepo, listReleasesBetween } = require('./github');
const { fetchNotesFromUrl } = require('./webFallback');
const { buildPrompt } = require('./prompt');
const { getProvider } = require('./providers');
const cache = require('./cache');

function makeError(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
}

/**
 * Analyze the release notes between a container's current and target version.
 * On-demand only. Throws Error with .code AI_DISABLED or NO_UPDATE for the
 * caller to map to HTTP status.
 * @param {Object} container
 * @param {{force?: boolean}} options
 * @returns {Promise<Object>}
 */
async function analyzeUpdate(container, { force = false } = {}) {
    const config = getAiConfiguration();
    if (!config.enabled) {
        throw makeError('AI analysis is not configured', 'AI_DISABLED');
    }
    if (!container.result) {
        throw makeError('No update available for this container', 'NO_UPDATE');
    }

    const current = container.image.tag.value;
    const target = container.result.tag;
    const model = config.gemini.model;
    const cacheKey = cache.key({ id: container.id, current, target, model });
    if (!force) {
        const cached = cache.get(cacheKey);
        if (cached) {
            return cached;
        }
    }

    const repo = detectRepo(container);
    let notes = [];
    let source = 'none';
    if (repo) {
        notes = await listReleasesBetween(repo, current, target, config.github.token);
        if (notes.length) {
            source = 'github';
        }
    }
    if (!notes.length) {
        const url = (container.result && container.result.link) || container.link;
        const text = url ? await fetchNotesFromUrl(url) : '';
        if (text) {
            notes = [{ tag: target, date: null, body: text }];
            source = 'web';
        }
    }

    if (!notes.length) {
        const empty = {
            riskLevel: 'unknown',
            breakingChanges: [],
            highlights: [],
            overview: 'No release notes could be located for this update.',
            versionsCovered: [],
            source: 'none',
            sourceNotes: [],
        };
        cache.set(cacheKey, empty);
        return empty;
    }

    const provider = getProvider(config.provider);
    const { system, user, schema } = buildPrompt(container, notes);
    const result = await provider.generate({
        system,
        user,
        schema,
        model,
        apiKey: config.gemini.apikey,
    });
    result.source = source;
    result.sourceNotes = notes;
    cache.set(cacheKey, result);
    return result;
}

module.exports = {
    analyzeUpdate,
};
