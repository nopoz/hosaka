const request = require('../../../request');
const runPortainerUpdate = require('./portainerUpdate');

const {
    requireArray, demuxDockerStream, rewriteStackFile, discoverEndpoint, checkContainerState,
    unhealthyVerdict,
} = runPortainerUpdate.internals;

jest.mock('../../../request');

const env = { portainerUrl: 'http://portainer/api', apiKey: 'key', insecure: false };

// Route mocked request() calls by the path suffix of opts.uri.
function route(map) {
    request.mockImplementation(async (opts) => {
        const path = opts.uri.replace(env.portainerUrl, '');
        for (const [matcher, value] of map) {
            if (matcher instanceof RegExp ? matcher.test(path) : path === matcher) {
                if (value instanceof Error) throw value;
                return typeof value === 'function' ? value(opts) : value;
            }
        }
        throw new Error(`unmocked path: ${path}`);
    });
}

beforeEach(() => {
    request.mockReset();
});

describe('requireArray', () => {
    test('passes arrays through', () => {
        expect(requireArray([1, 2], 'x')).toEqual([1, 2]);
    });
    test('surfaces a Portainer error message on a non-array object', () => {
        expect(() => requireArray({ message: 'endpoint not found' }, 'inspecting foo'))
            .toThrow(/inspecting foo: endpoint not found/);
    });
    test('falls back to a generic message when none is present', () => {
        expect(() => requireArray('<html>502</html>', 'listing stacks'))
            .toThrow(/was not a JSON array/);
    });
});

describe('demuxDockerStream', () => {
    test('decodes a multiplexed frame', () => {
        const payload = Buffer.from('hello world');
        const header = Buffer.from([1, 0, 0, 0, 0, 0, 0, payload.length]);
        expect(demuxDockerStream(Buffer.concat([header, payload]))).toBe('hello world');
    });
    test('passes raw/TTY output through unframed', () => {
        expect(demuxDockerStream(Buffer.from('plain log line'))).toBe('plain log line');
    });
});

describe('rewriteStackFile', () => {
    const base = { imageName: 'it-tools', currentVersion: '1.0', targetVersion: '2.0' };
    test('rewrites the pinned tag', () => {
        const out = rewriteStackFile({ ...base, stackFileContent: 'image: ghcr.io/c/it-tools:1.0\n' });
        expect(out).toContain('ghcr.io/c/it-tools:2.0');
        expect(out).not.toContain('it-tools:1.0');
    });
    test('throws an actionable error when the current tag is absent', () => {
        expect(() => rewriteStackFile({ ...base, stackFileContent: 'image: ghcr.io/c/it-tools:0.9\n' }))
            .toThrow(/could not find "it-tools:1.0"/);
    });
    test('hints when the stack pins a moving tag', () => {
        expect(() => rewriteStackFile({ ...base, stackFileContent: 'image: it-tools:latest\n' }))
            .toThrow(/moving tag/);
    });
});

describe('discoverEndpoint', () => {
    const target = { containerName: 'it-tools', composeProject: 'it-tools', watcher: 'local' };

    test('selects the endpoint whose proxy lists the container in the project', async () => {
        route([
            ['/endpoints?name=local', [{ Id: 1 }, { Id: 2 }]],
            ['/endpoints/1/docker/containers/json?all=true', [{ Names: ['/other'], Labels: {} }]],
            ['/endpoints/2/docker/containers/json?all=true', [{
                Names: ['/it-tools'],
                Labels: { 'com.docker.compose.project': 'it-tools' },
                Portainer: { ResourceControl: { Id: 9 } },
            }]],
        ]);
        const result = await discoverEndpoint(env, target);
        expect(result.endpointId).toBe(2);
        expect(result.container.Portainer.ResourceControl.Id).toBe(9);
    });

    test('falls back to a full scan when the name query is empty', async () => {
        route([
            ['/endpoints?name=local', []],
            ['/endpoints', [{ Id: 5 }]],
            ['/endpoints/5/docker/containers/json?all=true', [{
                Names: ['/it-tools'],
                Labels: { 'com.docker.compose.project': 'it-tools' },
                Portainer: { ResourceControl: { Id: 3 } },
            }]],
        ]);
        const result = await discoverEndpoint(env, target);
        expect(result.endpointId).toBe(5);
    });

    // Issue #97: a non-array (error) proxy response must not crash discovery or
    // be misreported - it is skipped, and a genuinely-absent container yields a
    // clean null result that the caller turns into an actionable message.
    test('skips an environment that returns a non-array error body (#97)', async () => {
        route([
            ['/endpoints?name=local', [{ Id: 1 }]],
            ['/endpoints/1/docker/containers/json?all=true', { message: 'environment is down' }],
        ]);
        const result = await discoverEndpoint(env, target);
        expect(result.endpointId).toBeNull();
    });
});

describe('checkContainerState', () => {
    const list = [{ Names: ['/c'], Id: 'abc' }];
    function inspectRoute(info) {
        route([
            ['/endpoints/1/docker/containers/json?all=true', list],
            ['/endpoints/1/docker/containers/abc/json', info],
        ]);
    }
    test('reports ready when running the target image with a new image id', async () => {
        inspectRoute({ Config: { Image: 'ghcr.io/x/c:2.0' }, State: { Status: 'running' }, Image: 'sha256:new' });
        expect(await checkContainerState(env, 1, 'c', 'c:2.0', 'sha256:old')).toBe('ready');
    });
    test('reports sameimage when the image id is unchanged', async () => {
        inspectRoute({ Config: { Image: 'ghcr.io/x/c:2.0' }, State: { Status: 'running' }, Image: 'sha256:old' });
        expect(await checkContainerState(env, 1, 'c', 'c:2.0', 'sha256:old')).toBe('sameimage');
    });
    test('reports absent when the container is not listed', async () => {
        route([['/endpoints/1/docker/containers/json?all=true', []]]);
        expect(await checkContainerState(env, 1, 'c', 'c:2.0', '')).toBe('absent');
    });
});

describe('unhealthyVerdict', () => {
    // First unhealthy sighting starts the grace window instead of failing - a
    // freshly-started container often flaps unhealthy during warmup.
    test('starts the grace window on the first unhealthy sighting', () => {
        expect(unhealthyVerdict(null, 1000, 30)).toBe('start-grace');
    });
    test('keeps waiting while still inside the grace window', () => {
        expect(unhealthyVerdict(1000, 1020, 30)).toBe('wait');
    });
    test('fails once unhealthy persists past the grace window', () => {
        expect(unhealthyVerdict(1000, 1031, 30)).toBe('fail');
    });
});
