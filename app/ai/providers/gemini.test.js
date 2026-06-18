const request = require('../../request');

jest.mock('../../request');
const gemini = require('./gemini');

beforeEach(() => {
    jest.resetAllMocks();
    // Skip the real backoff delay so retry tests run instantly.
    gemini.__set__('sleep', () => Promise.resolve());
});

function content(json) {
    return { candidates: [{ content: { parts: [{ text: json }] } }] };
}

function httpError(status) {
    const error = new Error(`Request failed with status code ${status}`);
    error.response = { status };
    return error;
}

test('generate posts to gemini with the api-key header and parses JSON content', async () => {
    request.mockResolvedValue(content('{"riskLevel":"low","overview":"ok"}'));
    const result = await gemini.generate({
        system: 'sys',
        user: 'usr',
        schema: { type: 'object' },
        model: 'gemini-2.5-flash-lite',
        apiKey: 'KEY',
    });
    expect(result).toStrictEqual({ riskLevel: 'low', overview: 'ok' });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
        uri: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
        method: 'POST',
        headers: { 'x-goog-api-key': 'KEY' },
        timeout: 20000,
    }));
    const body = request.mock.calls[0][0].body;
    expect(body.contents[0].parts[0].text).toBe('usr');
    expect(body.systemInstruction.parts[0].text).toBe('sys');
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema).toStrictEqual({ type: 'object' });
});

test('generate throws when the model returns no content', async () => {
    request.mockResolvedValue({ candidates: [] });
    await expect(gemini.generate({
        user: 'u', schema: {}, model: 'm', apiKey: 'k',
    })).rejects.toThrow('Gemini returned no content');
});

test('generate retries a transient 503 then succeeds', async () => {
    request
        .mockRejectedValueOnce(httpError(503))
        .mockResolvedValueOnce(content('{"riskLevel":"high"}'));
    const result = await gemini.generate({
        user: 'u', schema: {}, model: 'm', apiKey: 'k',
    });
    expect(result).toStrictEqual({ riskLevel: 'high' });
    expect(request).toHaveBeenCalledTimes(2);
});

test('generate gives a friendly overload message after exhausting retries on 503', async () => {
    request.mockRejectedValue(httpError(503));
    await expect(gemini.generate({
        user: 'u', schema: {}, model: 'm', apiKey: 'k',
    })).rejects.toThrow('The AI service is busy right now. Please try again in a moment.');
    expect(request).toHaveBeenCalledTimes(3);
});

test('generate fails fast on a timeout without retrying', async () => {
    const timeoutError = new Error('timeout of 20000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    request.mockRejectedValue(timeoutError);
    await expect(gemini.generate({
        user: 'u', schema: {}, model: 'm', apiKey: 'k',
    })).rejects.toThrow('The AI service took too long to respond. Please try again.');
    expect(request).toHaveBeenCalledTimes(1);
});

test('generate does not retry a non-transient error', async () => {
    request.mockRejectedValue(httpError(400));
    await expect(gemini.generate({
        user: 'u', schema: {}, model: 'm', apiKey: 'k',
    })).rejects.toThrow('Request failed with status code 400');
    expect(request).toHaveBeenCalledTimes(1);
});
