const request = require('../request');
const { parse, isGreater } = require('../tag');

const GITHUB_API = 'https://api.github.com';

/**
 * Locate the GitHub owner/repo for a container. The link is only a locator:
 * a tag-specific URL still resolves to the repo so the full release range can
 * be enumerated. Falls back to fuzzing ghcr.io image names.
 * @param {Object} container
 * @returns {{owner: string, repo: string}|null}
 */
function detectRepo(container) {
    const candidates = [
        container.linkTemplate,
        container.link,
        container.result && container.result.link,
    ];
    for (let i = 0; i < candidates.length; i += 1) {
        const url = candidates[i];
        if (typeof url === 'string') {
            const match = url.match(/github\.com[/:]([^/\s]+)\/([^/\s#?]+)/i);
            if (match) {
                return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
            }
        }
    }
    const registry = container.image && container.image.registry;
    const registryUrl = (registry && (registry.url || registry.name)) || '';
    const name = (container.image && container.image.name) || '';
    if (/ghcr\.io/i.test(registryUrl) && name.includes('/')) {
        const [owner, repo] = name.split('/');
        return { owner, repo };
    }
    return null;
}

/**
 * List GitHub releases with current < tag <= target, newest last. Drafts and
 * non-semver tags are skipped. POC fetches up to 100 releases in one page.
 * @returns {Promise<Array<{tag,name,date,body,prerelease}>>}
 */
async function listReleasesBetween(repo, current, target, token) {
    const headers = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'hosaka',
    };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    const response = await request({
        uri: `${GITHUB_API}/repos/${repo.owner}/${repo.repo}/releases`,
        method: 'GET',
        qs: { per_page: 100 },
        headers,
        resolveWithFullResponse: true,
    });
    const releases = Array.isArray(response.body) ? response.body : [];
    const kept = [];
    releases.forEach((release) => {
        if (release.draft) {
            return;
        }
        const tag = release.tag_name;
        if (!tag || parse(tag) === null) {
            return;
        }
        const aboveCurrent = isGreater(tag, current) && !isGreater(current, tag);
        const atOrBelowTarget = isGreater(target, tag);
        if (aboveCurrent && atOrBelowTarget) {
            kept.push({
                tag,
                name: release.name || tag,
                date: release.published_at || null,
                body: release.body || '',
                prerelease: Boolean(release.prerelease),
            });
        }
    });
    kept.sort((a, b) => {
        if (a.tag === b.tag) {
            return 0;
        }
        return isGreater(a.tag, b.tag) ? 1 : -1;
    });
    return kept;
}

module.exports = {
    detectRepo,
    listReleasesBetween,
};
