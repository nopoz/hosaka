const request = require('../../request');

jest.mock('../../request');
const gemini = require('./gemini');

beforeEach(() => {
    jest.resetAllMocks();
});

test('generate posts to gemini with the api-key header and parses JSON content', async () => {
    request.mockResolvedValue({
        candidates: [{ content: { parts: [{ text: '{"riskLevel":"low","overview":"ok"}' }] } }],
    });
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
    }));
    const body = request.mock.calls[0][0].body;
    expect(body.contents[0].parts[0].text).toBe('usr');
    expect(body.systemInstruction.parts[0].text).toBe('sys');
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema).toStrictEqual({ type: 'object' });
});

test('generate throws when the model returns no content', async () => {
    request.mockResolvedValue({ candidates: [] });
    await expect(gemini.generate({ user: 'u', schema: {}, model: 'm', apiKey: 'k' }))
        .rejects.toThrow('Gemini returned no content');
});
