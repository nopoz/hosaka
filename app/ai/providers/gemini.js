const request = require('../../request');

const log = require('../../log').child({ component: 'ai.gemini' });

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// Per-attempt cap so a slow/hung upstream can't spin the UI loader forever.
// Gemini normally answers in a few seconds; a hit on this means trouble, so a
// timeout is NOT retried (that only stacks more long waits) - we fail fast and
// let the user retry. Fast-failing overload statuses ARE retried.
const TIMEOUT_MS = 20000;
// Gemini (especially the -lite tiers) intermittently returns 503 "overloaded";
// a couple of short retries clears most of them before the user sees an error.
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [800, 2500];
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function isTimeout(error) {
    return error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '');
}

function isRetryable(error) {
    const status = error.response && error.response.status;
    return RETRYABLE_STATUS.has(status);
}

/**
 * Map raw axios/network failures to a user-facing message. Unknown errors pass
 * through unchanged.
 */
function friendlyError(error) {
    const status = error.response && error.response.status;
    if (status === 503 || status === 429) {
        return new Error('The AI service is busy right now. Please try again in a moment.');
    }
    if (isTimeout(error)) {
        return new Error('The AI service took too long to respond. Please try again.');
    }
    return error;
}

/**
 * Call Gemini's generateContent endpoint with JSON-mode output. Retries
 * transient errors (overload/timeout) with a short backoff.
 * @param {{system?:string, user:string, schema:Object, model:string, apiKey:string}} args
 * @returns {Promise<Object>}
 */
async function generate({
    system, user, schema, model, apiKey,
}) {
    const body = {
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.2,
        },
    };
    if (system) {
        body.systemInstruction = { parts: [{ text: system }] };
    }

    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const response = await request({
                uri: `${GEMINI_BASE}/${model}:generateContent`,
                method: 'POST',
                headers: { 'x-goog-api-key': apiKey },
                body,
                timeout: TIMEOUT_MS,
            });
            const text = response
                && response.candidates
                && response.candidates[0]
                && response.candidates[0].content
                && response.candidates[0].content.parts
                && response.candidates[0].content.parts[0]
                && response.candidates[0].content.parts[0].text;
            if (!text) {
                throw new Error('Gemini returned no content');
            }
            return JSON.parse(text);
        } catch (error) {
            lastError = error;
            if (attempt >= MAX_ATTEMPTS || !isRetryable(error)) {
                throw friendlyError(error);
            }
            const status = error.response && error.response.status;
            log.warn({ attempt, status, model }, 'gemini call failed, retrying');
            // eslint-disable-next-line no-await-in-loop
            await sleep(RETRY_DELAYS_MS[attempt - 1]);
        }
    }
    throw friendlyError(lastError);
}

module.exports = {
    generate,
};
