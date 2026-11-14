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

test('detectRepo prefers the OCI source label over ghcr name fuzzing', () => {
    const container = {
        image: {
            name: 'linuxserver/socket-proxy',
            registry: { url: 'https://ghcr.io/v2' },
            source: 'https://github.com/linuxserver/docker-socket-proxy',
        },
    };
    expect(detectRepo(container)).toStrictEqual({
        owner: 'linuxserver',
        repo: 'docker-socket-proxy',
    });
});

test('detectRepo lets a configured link template win over the OCI source label', () => {
    const container = {
        linkTemplate: 'https://github.com/adnanh/webhook/releases/tag/2.8.3',
        image: {
            name: 'linuxserver-labs/webhook',
            registry: { url: 'https://ghcr.io/v2' },
            source: 'https://github.com/linuxserver-labs/docker-webhook',
        },
    };
    expect(detectRepo(container)).toStrictEqual({ owner: 'adnanh', repo: 'webhook' });
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
            {
                tag_name: 'v1.4.2', name: 'r142', body: 'b142', published_at: '2026-01-02', prerelease: false, html_url: 'https://github.com/nopoz/hosaka/releases/tag/v1.4.2',
            },
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
        tag: 'v1.4.2',
        name: 'r142',
        date: '2026-01-02',
        body: 'b142',
        prerelease: false,
        url: 'https://github.com/nopoz/hosaka/releases/tag/v1.4.2',
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

test('listReleasesBetween returns [] on a 404 (guessed repo has no releases page)', async () => {
    const err = new Error('Request failed with status code 404');
    err.response = { status: 404 };
    request.mockRejectedValue(err);
    const result = await listReleasesBetween({ owner: 'nope', repo: 'nope' }, 'v1.0.0', 'v2.0.0', '');
    expect(result).toStrictEqual([]);
});

test('listReleasesBetween rethrows non-404 errors', async () => {
    const err = new Error('boom');
    err.response = { status: 500 };
    request.mockRejectedValue(err);
    await expect(
        listReleasesBetween({ owner: 'a', repo: 'b' }, 'v1.0.0', 'v2.0.0', ''),
    ).rejects.toThrow('boom');
});

function githubError(status, message, headers = {}) {
    const err = new Error(`Request failed with status code ${status}`);
    err.response = { status, headers, data: { message } };
    return err;
}

test('listReleasesBetween explains a rejected token', async () => {
    request.mockRejectedValue(githubError(401, 'Bad credentials'));
    await expect(
        listReleasesBetween({ owner: 'a', repo: 'b' }, 'v1.0.0', 'v2.0.0', 'bad'),
    ).rejects.toThrow('GitHub rejected HOSAKA_AI_GITHUB_TOKEN (Bad credentials). Check that the token is valid and not expired.');
});

test('listReleasesBetween explains the rate limit and suggests a token when none is set', async () => {
    request.mockRejectedValue(githubError(403, 'API rate limit exceeded for 1.2.3.4.', { 'x-ratelimit-remaining': '0' }));
    await expect(
        listReleasesBetween({ owner: 'a', repo: 'b' }, 'v1.0.0', 'v2.0.0', ''),
    ).rejects.toThrow('GitHub API rate limit reached while fetching release notes. Try again later, or set HOSAKA_AI_GITHUB_TOKEN to raise the limit.');
});

test('listReleasesBetween explains a secondary rate limit without the token hint when a token is set', async () => {
    request.mockRejectedValue(githubError(429, 'You have exceeded a secondary rate limit.', { 'retry-after': '60' }));
    await expect(
        listReleasesBetween({ owner: 'a', repo: 'b' }, 'v1.0.0', 'v2.0.0', 'tok'),
    ).rejects.toThrow(/^GitHub API rate limit reached while fetching release notes\. Try again later\.$/);
});

test('listReleasesBetween surfaces the message GitHub returns for other errors', async () => {
    request.mockRejectedValue(githubError(403, 'Resource not accessible by personal access token'));
    await expect(
        listReleasesBetween({ owner: 'a', repo: 'b' }, 'v1.0.0', 'v2.0.0', 'tok'),
    ).rejects.toThrow('GitHub error (403): Resource not accessible by personal access token');
});
