const log = require('../log').child({ component: 'ai' });
const { getAiConfiguration } = require('../configuration');
const { detectRepo, listReleasesBetween } = require('./github');
const { fetchNotesFromUrl } = require('./webFallback');
const { enrichNotes } = require('./enrich');
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
    const image = container.image.name;
    log.info({
        image, current, target, force,
    }, 'analyzing update');
    const cacheKey = cache.key({ id: container.id, current, target, model });
    if (!force) {
        const cached = cache.get(cacheKey);
        if (cached) {
            log.debug({ image, current, target }, 'returning cached analysis');
            return cached;
        }
    }

    const repo = detectRepo(container);
    let notes = [];
    let source = 'none';
    if (repo) {
        log.info({ owner: repo.owner, repo: repo.repo }, 'detected github repo');
        notes = await listReleasesBetween(repo, current, target, config.github.token);
        log.info({ count: notes.length }, 'github releases in range');
        if (notes.length) {
            source = 'github';
            notes = await enrichNotes(notes, log);
        }
    } else {
        log.info({ image }, 'no github repo detected');
    }
    if (!notes.length) {
        const url = (container.result && container.result.link) || container.link;
        const text = url ? await fetchNotesFromUrl(url) : '';
        if (text) {
            notes = [{
                tag: target, date: null, body: text, url,
            }];
            source = 'web';
            log.info({ url }, 'using web fallback for notes');
        }
    }

    if (!notes.length) {
        log.info({ image, current, target }, 'no release notes located');
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
    const {
        system, user, schema, dropped, chars,
    } = buildPrompt(container, notes);
    if (dropped) {
        log.warn({ dropped, image }, 'release notes truncated to fit the prompt budget');
    }
    log.info({
        provider: config.provider, model, source, notes: notes.length, chars,
    }, 'requesting analysis from model');
    const started = Date.now();
    let result;
    try {
        result = await provider.generate({
            system,
            user,
            schema,
            model,
            apiKey: config.gemini.apikey,
        });
    } catch (e) {
        log.error({ image, err: e.message, ms: Date.now() - started }, 'model analysis failed');
        throw e;
    }
    log.info({
        image, riskLevel: result.riskLevel, ms: Date.now() - started,
    }, 'analysis complete');
    result.source = source;
    result.sourceNotes = notes;
    cache.set(cacheKey, result);
    return result;
}

module.exports = {
    analyzeUpdate,
};
