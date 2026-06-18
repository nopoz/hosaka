const request = require('../request');

jest.mock('../request');
const { fetchNotesFromUrl } = require('./webFallback');

beforeEach(() => {
    jest.resetAllMocks();
});

test('strips html and script content to plain text', async () => {
    request.mockResolvedValue(
        '<html><body><h1>Notes</h1><p>Hello <b>world</b></p><script>evil()</script></body></html>',
    );
    const text = await fetchNotesFromUrl('http://x');
    expect(text).toContain('Notes');
    expect(text).toContain('Hello world');
    expect(text).not.toContain('<');
    expect(text).not.toContain('evil()');
});

test('returns an empty string on request error', async () => {
    request.mockRejectedValue(new Error('boom'));
    expect(await fetchNotesFromUrl('http://x')).toBe('');
});
