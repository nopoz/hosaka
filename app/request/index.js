const axios = require('axios');

/**
 * Minimal drop-in replacement for the (deprecated) request-promise-native calls
 * used across registries and triggers. Accepts the subset of request options
 * this codebase relies on and maps them onto axios.
 *
 * Returns the parsed response body by default, or, when resolveWithFullResponse
 * is set, an object exposing body/headers/statusCode (matching the previous
 * request-promise behaviour relied on by the registry pagination/manifest code).
 *
 * @param {object} options request-style options
 * @returns {Promise<*>}
 */
async function request(options = {}) {
    const {
        uri,
        url,
        method = 'GET',
        headers,
        qs,
        body,
        form,
        auth,
        proxy,
        resolveWithFullResponse = false,
    } = options;

    const config = {
        url: uri || url,
        method: String(method).toLowerCase(),
        headers: { ...headers },
    };

    if (qs !== undefined) {
        config.params = qs;
    }
    if (body !== undefined) {
        config.data = body;
    }
    if (form !== undefined) {
        config.data = form;
    }

    if (auth) {
        if (auth.bearer) {
            config.headers.Authorization = `Bearer ${auth.bearer}`;
        } else {
            config.auth = { username: auth.user, password: auth.pass };
        }
    }

    if (proxy) {
        const parsed = new URL(proxy);
        config.proxy = {
            protocol: parsed.protocol.replace(':', ''),
            host: parsed.hostname,
            port: parsed.port ? Number(parsed.port) : undefined,
        };
    }

    const response = await axios(config);

    if (resolveWithFullResponse) {
        const responseHeaders = typeof response.headers?.toJSON === 'function'
            ? response.headers.toJSON()
            : { ...response.headers };
        return {
            body: response.data,
            headers: responseHeaders,
            statusCode: response.status,
        };
    }
    return response.data;
}

module.exports = request;
