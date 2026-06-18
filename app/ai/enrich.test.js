jest.mock('./webFallback');

const { fetchNotesFromUrl } = require('./webFallback');
const { enrichNotes, pickExternalUrl } = require('./enrich');

beforeEach(() => {
    jest.resetAllMocks();
});

test('pickExternalUrl prefers a non-github, non-ci link', () => {
    expect(pickExternalUrl('see https://tailscale.com/changelog now'))
        .toBe('https://tailscale.com/changelog');
    expect(pickExternalUrl('https://github.com/x/y/compare/a...b')).toBeNull();
    expect(pickExternalUrl('artifact https://ci-tests.linuxserver.io/x/index.html')).toBeNull();
    expect(pickExternalUrl('no links here')).toBeNull();
});

test('enrichNotes appends external changelog text for a thin deferring note', async () => {
    fetchNotesFromUrl.mockResolvedValue('FULL CHANGELOG TEXT');
    const notes = [{
        tag: 'v1.98.2',
        body: 'Please refer to the changelog available at https://tailscale.com/changelog',
    }];
    const out = await enrichNotes(notes, null);
    expect(fetchNotesFromUrl).toHaveBeenCalledWith('https://tailscale.com/changelog');
    expect(out[0].body).toContain('FULL CHANGELOG TEXT');
});

test('enrichNotes leaves a substantial note untouched', async () => {
    const big = `${'x'.repeat(500)} https://example.com/page`;
    const out = await enrichNotes([{ tag: 'v1', body: big }], null);
    expect(fetchNotesFromUrl).not.toHaveBeenCalled();
    expect(out[0].body).toBe(big);
});

test('enrichNotes fetches a shared external url only once and appends once', async () => {
    fetchNotesFromUrl.mockResolvedValue('SHARED');
    const notes = [
        { tag: 'v1.98.2', body: 'see https://tailscale.com/changelog' },
        { tag: 'v1.98.3', body: 'see https://tailscale.com/changelog' },
    ];
    const out = await enrichNotes(notes, null);
    expect(fetchNotesFromUrl).toHaveBeenCalledTimes(1);
    expect(out[0].body).toContain('SHARED');
    expect(out[1].body).not.toContain('SHARED');
});

test('enrichNotes leaves the note untouched when the fetch yields nothing', async () => {
    fetchNotesFromUrl.mockResolvedValue('');
    const notes = [{ tag: 'v1', body: 'see https://tailscale.com/changelog' }];
    const out = await enrichNotes(notes, null);
    expect(out[0].body).toBe('see https://tailscale.com/changelog');
});
