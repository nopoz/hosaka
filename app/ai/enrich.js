const { fetchNotesFromUrl } = require('./webFallback');

// A release body that just points elsewhere ("see the changelog at <url>")
// carries no real notes. When a body is short or explicitly defers, follow the
// first external link and pull its text so the model has something to work with.
const THIN_BODY_CHARS = 280;
const DEFER_RE = /(refer to|see (the )?changelog|full changelog|available at|release notes?\b[^.]{0,40}\bat\b)/i;
const URL_RE = /https?:\/\/[^\s)\]<>"']+/gi;

/**
 * Pick the first link worth following: external (not GitHub, not a CI artifact).
 * @param {string} body
 * @returns {string|null}
 */
function pickExternalUrl(body) {
    const urls = body.match(URL_RE) || [];
    const external = urls.find((u) => !/github\.com|githubusercontent\.com|ci-tests\./i.test(u));
    return external || null;
}

/**
 * Enrich notes that defer to an external changelog by appending that page's
 * text. Each distinct URL is fetched once and appended once; failures leave the
 * note untouched. Returns a new array.
 * @param {Array<{tag,body}>} notes
 * @param {Object} log
 * @returns {Promise<Array>}
 */
async function enrichNotes(notes, log) {
    const fetched = new Map();
    const appended = new Set();
    const out = [];
    for (let i = 0; i < notes.length; i += 1) {
        const note = notes[i];
        const body = note.body || '';
        const defers = body.length < THIN_BODY_CHARS || DEFER_RE.test(body);
        const url = defers ? pickExternalUrl(body) : null;
        if (!url || appended.has(url)) {
            out.push(note);
        } else {
            if (!fetched.has(url)) {
                // eslint-disable-next-line no-await-in-loop
                fetched.set(url, await fetchNotesFromUrl(url));
            }
            const text = fetched.get(url);
            if (text) {
                appended.add(url);
                if (log) {
                    log.info({ tag: note.tag, url }, 'enriched release note from external changelog');
                }
                out.push({ ...note, body: `${body}\n\n[External changelog: ${url}]\n${text}` });
            } else {
                out.push(note);
            }
        }
    }
    return out;
}

module.exports = {
    enrichNotes,
    pickExternalUrl,
};
