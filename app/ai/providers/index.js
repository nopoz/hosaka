const gemini = require('./gemini');

/**
 * Resolve an AI provider by name. New providers implement the same
 * generate({ system, user, schema, model, apiKey }) contract.
 * @param {string} name
 * @returns {{generate: Function}}
 */
function getProvider(name) {
    switch (name) {
        case 'gemini':
            return gemini;
        default:
            throw new Error(`Unsupported AI provider: ${name}`);
    }
}

module.exports = {
    getProvider,
};
