jest.mock('../configuration');
jest.mock('./github');
jest.mock('./providers');
jest.mock('./webFallback');

const { getAiConfiguration } = require('../configuration');
const { detectRepo, listReleasesBetween } = require('./github');
const { getProvider } = require('./providers');
const { fetchNotesFromUrl } = require('./webFallback');
const cache = require('./cache');
const { analyzeUpdate } = require('./index');

const ENABLED = {
    enabled: true,
    provider: 'gemini',
    gemini: { apikey: 'k', model: 'gemini-2.5-flash-lite' },
    github: { token: '' },
};

const MODEL_RESULT = {
    riskLevel: 'medium',
    breakingChanges: [{ title: 'Renamed FOO', detail: 'use BAR' }],
    highlights: ['Faster startup'],
    overview: 'Some changes',
    versionsCovered: ['v1.4.0', 'v1.4.2'],
};

function makeContainer() {
    return {
        id: 'abc',
        link: 'https://github.com/nopoz/hosaka/releases/tag/v1.2.2',
        linkTemplate: 'https://github.com/nopoz/hosaka/releases/tag/v1.2.2',
        image: { name: 'nopoz/hosaka', tag: { value: 'v1.2.2' }, registry: { url: 'ghcr.io' } },
        result: { tag: 'v1.4.2', link: 'https://github.com/nopoz/hosaka/releases/tag/v1.4.2' },
    };
}

let generate;

beforeEach(() => {
    jest.resetAllMocks();
    cache.clear();
    generate = jest.fn().mockResolvedValue({ ...MODEL_RESULT });
    getProvider.mockReturnValue({ generate });
});

test('throws AI_DISABLED when not configured', async () => {
    getAiConfiguration.mockReturnValue({ enabled: false, gemini: {} });
    await expect(analyzeUpdate(makeContainer(), {})).rejects.toHaveProperty('code', 'AI_DISABLED');
});

test('throws NO_UPDATE when the container has no result', async () => {
    getAiConfiguration.mockReturnValue(ENABLED);
    const container = makeContainer();
    delete container.result;
    await expect(analyzeUpdate(container, {})).rejects.toHaveProperty('code', 'NO_UPDATE');
});

test('happy path: github notes -> provider -> structured result', async () => {
    getAiConfiguration.mockReturnValue(ENABLED);
    detectRepo.mockReturnValue({ owner: 'nopoz', repo: 'hosaka' });
    listReleasesBetween.mockResolvedValue([
        { tag: 'v1.4.0', date: '2026-01-01', body: 'b140' },
        { tag: 'v1.4.2', date: '2026-01-02', body: 'b142' },
    ]);
    const result = await analyzeUpdate(makeContainer(), {});
    expect(result.riskLevel).toBe('medium');
    expect(result.source).toBe('github');
    expect(result.sourceNotes).toHaveLength(2);
    expect(generate).toHaveBeenCalledTimes(1);
});

test('enriches a github note that defers to an external changelog', async () => {
    getAiConfiguration.mockReturnValue(ENABLED);
    detectRepo.mockReturnValue({ owner: 'tailscale', repo: 'tailscale' });
    listReleasesBetween.mockResolvedValue([
        {
            tag: 'v1.98.2',
            date: null,
            body: 'Please refer to the changelog available at https://tailscale.com/changelog',
        },
    ]);
    fetchNotesFromUrl.mockResolvedValue('REAL CHANGELOG CONTENT');
    await analyzeUpdate(makeContainer(), {});
    expect(fetchNotesFromUrl).toHaveBeenCalledWith('https://tailscale.com/changelog');
    const sentUser = generate.mock.calls[0][0].user;
    expect(sentUser).toContain('REAL CHANGELOG CONTENT');
});

test('caches by id+current+target+model; force bypasses', async () => {
    getAiConfiguration.mockReturnValue(ENABLED);
    detectRepo.mockReturnValue({ owner: 'nopoz', repo: 'hosaka' });
    listReleasesBetween.mockResolvedValue([{ tag: 'v1.4.2', date: null, body: 'b' }]);
    await analyzeUpdate(makeContainer(), {});
    await analyzeUpdate(makeContainer(), {});
    expect(generate).toHaveBeenCalledTimes(1);
    await analyzeUpdate(makeContainer(), { force: true });
    expect(generate).toHaveBeenCalledTimes(2);
});

test('falls back to web fetch when no repo is detected', async () => {
    getAiConfiguration.mockReturnValue(ENABLED);
    detectRepo.mockReturnValue(null);
    fetchNotesFromUrl.mockResolvedValue('Some release page text');
    const result = await analyzeUpdate(makeContainer(), {});
    expect(fetchNotesFromUrl).toHaveBeenCalled();
    expect(result.source).toBe('web');
    expect(generate).toHaveBeenCalledTimes(1);
});

test('returns a no-notes payload when nothing can be gathered', async () => {
    getAiConfiguration.mockReturnValue(ENABLED);
    detectRepo.mockReturnValue(null);
    fetchNotesFromUrl.mockResolvedValue('');
    const result = await analyzeUpdate(makeContainer(), {});
    expect(result.riskLevel).toBe('unknown');
    expect(result.source).toBe('none');
    expect(generate).not.toHaveBeenCalled();
});
