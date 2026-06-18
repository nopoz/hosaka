const request = require('../request');

const MAX_CHARS = 12000;

/**
 * Fetch a URL and reduce it to plain text for the model. Used only when a
 * GitHub repo can't be located. Returns '' on any failure.
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchNotesFromUrl(url) {
    try {
        const html = await request({
            uri: url,
            method: 'GET',
            headers: { Accept: 'text/html', 'User-Agent': 'hosaka' },
            timeout: 15000,
        });
        const text = String(html)
            .replace(/<script[\s\S]*?<\/script[^>]*>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style[^>]*>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return text.slice(0, MAX_CHARS);
    } catch (e) {
        return '';
    }
}

module.exports = {
    fetchNotesFromUrl,
};
