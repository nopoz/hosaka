const request = require('../request');

jest.mock('../request');
const { detectRepo, listReleasesBetween } = require('./github');

beforeEach(() => {
    jest.resetAllMocks();
});

test('detectRepo extracts owner/repo from a tag-specific link', () => {
    const container = {
        linkTemplate: 'https://github.com/nopoz/hosaka/releases/tag/v1.2.2',
        image: { name: 'nopoz/hosaka', registry: { url: 'ghcr.io' } },
    };
    expect(detectRepo(container)).toStrictEqual({ owner: 'nopoz', repo: 'hosaka' });
});

test('detectRepo fuzzes ghcr image name when no link is present', () => {
    const container = {
        image: { name: 'nopoz/hosaka', registry: { url: 'ghcr.io' } },
    };
    expect(detectRepo(container)).toStrictEqual({ owner: 'nopoz', repo: 'hosaka' });
});

test('detectRepo returns null for a non-github, non-ghcr image', () => {
    const container = {
        image: { name: 'library/nginx', registry: { url: 'registry-1.docker.io' } },
    };
    expect(detectRepo(container)).toBeNull();
});

test('listReleasesBetween keeps current<tag<=target, excludes drafts and non-semver', async () => {
    request.mockResolvedValue({
        statusCode: 200,
        headers: {},
        body: [
            { tag_name: 'v1.5.0', body: 'too new' },
            { tag_name: 'v1.4.2', name: 'r142', body: 'b142', published_at: '2026-01-02', prerelease: false },
            { tag_name: 'v1.4.0', name: 'r140', body: 'b140', published_at: '2026-01-01' },
            { tag_name: 'v1.3.0', body: 'draft', draft: true },
            { tag_name: 'nightly', body: 'non-semver' },
            { tag_name: 'v1.2.2', body: 'current' },
        ],
    });
    const result = await listReleasesBetween(
        { owner: 'nopoz', repo: 'hosaka' }, 'v1.2.2', 'v1.4.2', '',
    );
    expect(result.map((r) => r.tag)).toStrictEqual(['v1.4.0', 'v1.4.2']);
    expect(result[1]).toStrictEqual({
        tag: 'v1.4.2', name: 'r142', date: '2026-01-02', body: 'b142', prerelease: false,
    });
    expect(request).toHaveBeenCalledWith(expect.objectContaining({
        uri: 'https://api.github.com/repos/nopoz/hosaka/releases',
        method: 'GET',
        resolveWithFullResponse: true,
    }));
});

test('listReleasesBetween adds an auth header when a token is supplied', async () => {
    request.mockResolvedValue({ statusCode: 200, headers: {}, body: [] });
    await listReleasesBetween({ owner: 'a', repo: 'b' }, 'v1.0.0', 'v2.0.0', 'tok');
    expect(request.mock.calls[0][0].headers.Authorization).toBe('Bearer tok');
});
