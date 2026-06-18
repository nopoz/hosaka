const request = require('../../request');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Call Gemini's generateContent endpoint with JSON-mode output.
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
    const response = await request({
        uri: `${GEMINI_BASE}/${model}:generateContent`,
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey },
        body,
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
}

module.exports = {
    generate,
};
