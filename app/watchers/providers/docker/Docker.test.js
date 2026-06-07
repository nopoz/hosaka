const { ValidationError } = require('joi');
const log = require('../../../log');
const prometheusWatcher = require('../../../prometheus/watcher');

jest.mock('../../../event');
jest.mock('../../../log');

const storeContainer = require('../../../store/container');

const Docker = require('./Docker');
const Hub = require('../../../registries/providers/hub/Hub');
const Ecr = require('../../../registries/providers/ecr/Ecr');
const Gcr = require('../../../registries/providers/gcr/Gcr');
const Acr = require('../../../registries/providers/acr/Acr');

const sampleSemver = require('../../samples/semver.json');
const sampleCoercedSemver = require('../../samples/coercedSemver.json');

let docker;
const hub = new Hub();
const ecr = new Ecr();
const gcr = new Gcr();
const acr = new Acr();

const configurationValid = {
    socket: '/var/run/docker.sock',
    port: 2375,
    watchbydefault: true,
    watchall: false,
    watchevents: true,
    cron: '0 * * * *',
    watchatstart: true,
};


beforeEach(() => {
    jest.resetAllMocks();
    prometheusWatcher.init();
    docker = new Docker();
    docker.name = 'test';
    docker.configuration = configurationValid;
    docker.log = log;
    docker.log.child = () => log;
    hub.getTags = () => (Promise.resolve([]));
    hub.configuration = { url: 'https://registry-1.docker.io' };
});

afterEach(() => {
    docker.deregister();
});

Docker.__set__('getRegistries', () => ({
    acr,
    ecr,
    gcr,
    hub,
}));

Docker.__set__('getWatchContainerGauge', () => ({
    set: () => {
    },
}));

test('validatedConfiguration should initialize when configuration is valid', () => {
    const validatedConfiguration = docker.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validatedConfiguration should initialize with default values when not provided', () => {
    const validatedConfiguration = docker.validateConfiguration({});
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validatedConfiguration should failed when configuration is invalid', () => {
    expect(() => {
        docker.validateConfiguration({ watchbydefault: 'xxx' });
    }).toThrowError(ValidationError);
});

test('initWatcher should create a configured DockerApi instance', () => {
    docker.configuration = docker.validateConfiguration(configurationValid);
    docker.initWatcher();
    expect(docker.dockerApi.modem.socketPath).toBe(configurationValid.socket);
});

const getTagCandidatesTestCases = [{
    source: sampleSemver,
    items: ['7.8.9'],
    candidates: ['7.8.9'],
}, {
    source: sampleCoercedSemver,
    items: ['7.8.9'],
    candidates: ['7.8.9'],
}, {
    source: sampleSemver,
    items: [],
    candidates: [],
}, {
    source: {
        ...sampleSemver,
        includeTags: '^\\d+\\.\\d+\\.\\d+$',
    },
    items: ['7.8.9'],
    candidates: ['7.8.9'],
}, {
    source: {
        ...sampleSemver,
        includeTags: '^v\\d+\\.\\d+\\.\\d+$',
    },
    items: ['7.8.9'],
    candidates: [],
}, {
    source: {
        ...sampleSemver,
        excludeTags: '^v\\d+\\.\\d+\\.\\d+$',
    },
    items: ['7.8.9'],
    candidates: ['7.8.9'],
}, {
    source: {
        ...sampleSemver,
        excludeTags: '\\d+\\.\\d+\\.\\d+$',
    },
    items: ['7.8.9'],
    candidates: [],
}, {
    source: sampleSemver,
    items: ['7.8.9', '4.5.6', '1.2.3'],
    candidates: ['7.8.9', '4.5.6'],
}, {
    source: sampleSemver,
    items: ['10.11.12', '7.8.9', '4.5.6', '1.2.3'],
    candidates: ['10.11.12', '7.8.9', '4.5.6'],
}, {
    source: {
        image: {
            tag: {
                value: '1.9.0',
                semver: true,
            },
        },
    },
    items: ['1.10.0', '1.2.3'],
    candidates: ['1.10.0'],
}, {
    // (b) .sig dropped (no include regex). Without the filter '7.8.9.sig'
    // coerces to 7.8.9 and would leak in as a candidate.
    source: sampleSemver,
    items: ['7.8.9', '7.8.9.sig'],
    candidates: ['7.8.9'],
}, {
    // (b) .sig dropped EVEN WITH an include regex that matches it (always-on).
    source: {
        ...sampleSemver,
        includeTags: '7.8.9',
    },
    items: ['7.8.9', '7.8.9.sig'],
    candidates: ['7.8.9'],
}, {
    // (a)+(c) sha-prefixed digest tag dropped (no include regex). Without the
    // filters 'sha256abcdef' coerces to 256.0.0 and would leak in.
    source: sampleSemver,
    items: ['7.8.9', 'sha256abcdef'],
    candidates: ['7.8.9'],
}, {
    // (a) gate off: when an include regex matches a sha tag, the sha-prefix
    // filter is bypassed and the tag survives (it coerces to a real semver).
    // Proves the sha drop is gated on the absence of a user include regex.
    source: {
        ...sampleSemver,
        includeTags: 'sha',
    },
    items: ['sha256abcdef'],
    candidates: ['sha256abcdef'],
}, {
    // (c) prefix propagation: current 'v1.2.3' keeps only 'v'-prefixed tags,
    // so a bare '1.3.0' is rejected and 'v1.3.0' accepted.
    source: {
        image: {
            tag: {
                value: 'v1.2.3',
                semver: true,
            },
        },
    },
    items: ['v1.3.0', '1.3.0'],
    candidates: ['v1.3.0'],
}, {
    // coerced-semver preserved (regression guard for the omitted segment-count
    // filter): current '4.5' still offered 3-segment '7.8.9'.
    source: sampleCoercedSemver,
    items: ['7.8.9', '7.8.9.sig'],
    candidates: ['7.8.9'],
}, {
    // digest-alias preserved (regression guard): alias 'v8.0.0' survives even
    // though prefix propagation would otherwise drop it (current tag '4.5.6'
    // has no prefix). digest match also skips the greater-semver step.
    source: sampleSemver,
    items: ['v8.0.0'],
    imageDigestMap: new Map([['xxx', { tags: ['v8.0.0'] }]]),
    candidates: ['v8.0.0'],
}];

test.each(getTagCandidatesTestCases)(
    'getTagCandidates should behave as expected',
    (item) => {
        expect(Docker.__get__('getTagCandidates')(item.source, item.items, docker.log, item.imageDigestMap)).toEqual(item.candidates);
    },
);

test('normalizeContainer should return ecr when applicable', () => {
    expect(Docker.__get__('normalizeContainer')({
        id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
        name: 'homeassistant',
        watcher: 'local',
        includeTags: '^\\d+\\.\\d+.\\d+$',
        image: {
            id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
            registry: {
                url: '123456789.dkr.ecr.eu-west-1.amazonaws.com',
            },
            name: 'test',
            tag: {
                value: '2021.6.4',
                semver: true,
            },
            digest: {
                watch: false,
                repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
            },
            architecture: 'amd64',
            os: 'linux',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {
            tag: '2021.6.5',
        },
    }).image).toStrictEqual({
        id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
        registry: {
            name: 'ecr',
            url: 'https://123456789.dkr.ecr.eu-west-1.amazonaws.com/v2',
        },
        name: 'test',
        tag: {
            value: '2021.6.4',
            semver: true,
        },
        digest: {
            watch: false,
            repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
        },
        architecture: 'amd64',
        os: 'linux',
        created: '2021-06-12T05:33:38.440Z',
    });
});

test('normalizeContainer should return gcr when applicable', () => {
    expect(Docker.__get__('normalizeContainer')({
        id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
        name: 'homeassistant',
        watcher: 'local',
        includeTags: '^\\d+\\.\\d+.\\d+$',
        image: {
            id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
            registry: {
                url: 'us.gcr.io',
            },
            name: 'test',
            tag: {
                value: '2021.6.4',
                semver: true,
            },
            digest: {
                watch: false,
                repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
            },
            architecture: 'amd64',
            os: 'linux',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {
            tag: '2021.6.5',
        },
    }).image).toStrictEqual({
        id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
        registry: {
            name: 'gcr',
            url: 'https://us.gcr.io/v2',
        },
        name: 'test',
        tag: {
            value: '2021.6.4',
            semver: true,
        },
        digest: {
            watch: false,
            repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
        },
        architecture: 'amd64',
        os: 'linux',
        created: '2021-06-12T05:33:38.440Z',
    });
});

test('normalizeContainer should return acr when applicable', () => {
    expect(Docker.__get__('normalizeContainer')({
        id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
        name: 'homeassistant',
        watcher: 'local',
        includeTags: '^\\d+\\.\\d+.\\d+$',
        image: {
            id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
            registry: {
                url: 'test.azurecr.io',
            },
            name: 'test',
            tag: {
                value: '2021.6.4',
                semver: true,
            },
            digest: {
                watch: false,
                repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
            },
            architecture: 'amd64',
            os: 'linux',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {
            tag: '2021.6.5',
        },
    }).image).toStrictEqual({
        id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
        registry: {
            name: 'acr',
            url: 'https://test.azurecr.io/v2',
        },
        name: 'test',
        tag: {
            value: '2021.6.4',
            semver: true,
        },
        digest: {
            watch: false,
            repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
        },
        architecture: 'amd64',
        os: 'linux',
        created: '2021-06-12T05:33:38.440Z',
    });
});

test('normalizeContainer should return original container when no matching provider found', () => {
    expect(Docker.__get__('normalizeContainer')({
        id: '31a61a8305ef1fc9a71fa4f20a68d7ec88b28e32303bbc4a5f192e851165b816',
        name: 'homeassistant',
        watcher: 'local',
        includeTags: '^\\d+\\.\\d+.\\d+$',
        image: {
            id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
            registry: {
                url: 'xxx',
            },
            name: 'test',
            tag: {
                value: '2021.6.4',
                semver: true,
            },
            digest: {
                watch: false,
                repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
            },
            architecture: 'amd64',
            os: 'linux',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {
            tag: '2021.6.5',
        },
    }).image).toEqual({
        id: 'sha256:d4a6fafb7d4da37495e5c9be3242590be24a87d7edcc4f79761098889c54fca6',
        registry: {
            name: 'unknown',
            url: 'xxx',
        },
        name: 'test',
        tag: {
            value: '2021.6.4',
            semver: true,
        },
        digest: {
            watch: false,
            repo: 'sha256:ca0edc3fb0b4647963629bdfccbb3ccfa352184b45a9b4145832000c2878dd72',
        },
        architecture: 'amd64',
        os: 'linux',
        created: '2021-06-12T05:33:38.440Z',
    });
});

test('findNewVersion should return new image version when found', async () => {
    hub.getTags = () => (['7.8.9']);
    hub.getImageManifestDigest = () => ({ digest: 'sha256:abcdef', version: 2 });
    await expect(docker.findNewVersion(sampleSemver, docker.log)).resolves.toMatchObject({
        tag: '7.8.9',
        digest: 'sha256:abcdef',
    });
});

test('findNewVersion should return same result as current when no image version found', async () => {
    hub.getTags = () => ([]);
    hub.getImageManifestDigest = () => ({ digest: 'sha256:abcdef', version: 2 });
    await expect(docker.findNewVersion(sampleSemver, docker.log)).resolves.toMatchObject({
        tag: '4.5.6',
        digest: 'sha256:abcdef',
    });
});

test('addImageDetailsToContainer should add an image definition to the container', async () => {
    storeContainer.getContainer = () => (undefined);
    docker.dockerApi = {
        getContainer: () => ({
            inspect: () => ({ State: { Status: 'running' } }),
        }),
        getImage: () => ({
            inspect: () => ({
                Id: 'image-123456789',
                Architecture: 'arch',
                Os: 'os',
                Size: '10',
                Created: '2021-06-12T05:33:38.440Z',
                Names: ['test'],
                RepoDigests: ['test/test@sha256:2256fd5ac3e1079566f65cc9b34dc2b8a1b0e0e1bb393d603f39d0e22debb6ba'],
                Config: {
                    Image: 'sha256:c724d57be8bfda30b526396da9f53adb6f6ef15f7886df17b0a0bb8349f1ad79',
                },
            }),
        }),
    };
    const container = {
        Id: 'container-123456789',
        Image: 'organization/image:version',
        Names: ['/test'],
        Labels: {},
    };

    const containerWithImage = await docker.addImageDetailsToContainer(container);
    expect(containerWithImage).toMatchObject({
        id: 'container-123456789',
        name: 'test',
        watcher: 'test',
        image: {
            id: 'image-123456789',
            registry: {},
            name: 'organization/image',
            tag: {
                value: 'version',
                semver: false,
            },
            digest: {
                watch: true,
                repo: 'sha256:2256fd5ac3e1079566f65cc9b34dc2b8a1b0e0e1bb393d603f39d0e22debb6ba',
            },
            architecture: 'arch',
            os: 'os',
            created: '2021-06-12T05:33:38.440Z',
        },
        result: {
            tag: 'version',
        },
    });
});

test('addImageDetailsToContainer should support transforms', async () => {
    storeContainer.getContainer = () => (undefined);
    docker.dockerApi = {
        getContainer: () => ({
            inspect: () => ({ State: { Status: 'running' } }),
        }),
        getImage: () => ({
            inspect: () => ({
                Id: 'image-123456789',
                Architecture: 'arch',
                Os: 'os',
            }),
        }),
    };
    const container = {
        Id: 'container-123456789',
        Image: 'organization/image:version',
        Names: ['/test'],
        Labels: {},
    };
    const tagTransform = '^(version)$ => $1-1.0.0';

    const containerWithImage = await docker.addImageDetailsToContainer(
        container,
        undefined, // tagInclude
        undefined, // tagExclude
        tagTransform,
    );
    expect(containerWithImage).toMatchObject({
        image: {
            tag: {
                value: 'version',
                semver: true,
            },
        },
        result: {
            tag: 'version',
        },
    });
});

test('watchContainer should return container report when found', async () => {
    storeContainer.getContainer = () => (undefined);
    storeContainer.insertContainer = (container) => (container);
    docker.dockerApi = {
        getContainer: () => ({
            inspect: () => ({ State: { Status: 'running' }, Image: 'image-123456789' }),
        }),
    };
    docker.findNewVersion = () => ({
        tag: '7.8.9',
    });
    hub.getTags = () => (['7.8.9']);
    await expect(docker.watchContainer(sampleSemver)).resolves.toMatchObject({
        changed: true,
        container: {
            result: {
                tag: '7.8.9',
            },
        },
    });
});

test('watchContainer should return container report when no image version found', async () => {
    storeContainer.getContainer = () => (undefined);
    storeContainer.insertContainer = (container) => (container);
    docker.dockerApi = {
        getContainer: () => ({
            inspect: () => ({ State: { Status: 'running' }, Image: 'image-123456789' }),
        }),
    };
    docker.findNewVersion = () => (undefined);
    hub.getTags = () => ([]);
    await expect(docker.watchContainer(sampleSemver)).resolves.toMatchObject({
        changed: true,
        container: {
            result: undefined,
        },
    });
});

test('watchContainer should return container report with error when something bad happens', async () => {
    storeContainer.getContainer = () => (undefined);
    storeContainer.insertContainer = (container) => (container);
    docker.dockerApi = {
        getContainer: () => ({
            inspect: () => ({ State: { Status: 'running' }, Image: 'image-123456789' }),
        }),
    };
    docker.findNewVersion = () => { throw new Error('Failure!!!'); };
    await expect(docker.watchContainer(sampleSemver)).resolves.toMatchObject({
        container: { error: { message: 'Failure!!!' } },
    });
});

test('watch should return a list of containers with changed', async () => {
    storeContainer.getContainer = () => (undefined);
    storeContainer.insertContainer = (containerWithResult) => (containerWithResult);

    const container1 = {
        Id: 'container-123456789',
        Image: 'organization/image:version',
        Names: ['/test'],
        Architecture: 'arch',
        Os: 'os',
        Size: '10',
        Created: '2019-05-20T12:02:06.307Z',
        Labels: {},
        RepoDigests: ['test/test@sha256:2256fd5ac3e1079566f65cc9b34dc2b8a1b0e0e1bb393d603f39d0e22debb6ba'],
        Config: {
            Image: 'sha256:c724d57be8bfda30b526396da9f53adb6f6ef15f7886df17b0a0bb8349f1ad79',
        },
    };
    docker.dockerApi = {
        listContainers: () => ([container1]),
        getContainer: () => ({
            inspect: () => ({ State: { Status: 'running' }, Image: 'image-123456789' }),
        }),
        getImage: () => ({
            inspect: () => ({
                Architecture: 'arch',
                Os: 'os',
                Created: '2021-06-12T05:33:38.440Z',
                Id: 'image-123456789',
            }),
        }),
    };
    await expect(docker.watch()).resolves.toMatchObject([{
        changed: true,
        container: {
            id: 'container-123456789',
            result: {
                tag: 'version',
            },
        },
    }]);
});

test('watch should log error when watching a container fails', async () => {
    storeContainer.getContainer = () => (undefined);
    storeContainer.insertContainer = (containerWithResult) => (containerWithResult);
    const container1 = {
        Id: 'container-123456789',
        Image: 'organization/image:version',
        Names: ['/test'],
        Architecture: 'arch',
        Os: 'os',
        Size: '10',
        Created: '2019-05-20T12:02:06.307Z',
        Labels: {},
        RepoDigests: ['test/test@sha256:2256fd5ac3e1079566f65cc9b34dc2b8a1b0e0e1bb393d603f39d0e22debb6ba'],
        Config: {
            Image: 'sha256:c724d57be8bfda30b526396da9f53adb6f6ef15f7886df17b0a0bb8349f1ad79',
        },
    };
    docker.dockerApi = {
        listContainers: () => ([container1]),
        getContainer: () => ({
            inspect: () => ({ State: { Status: 'running' }, Image: 'image-123456789' }),
        }),
        getImage: () => ({
            inspect: () => ({
                Architecture: 'arch',
                Os: 'os',
                Created: '2021-06-12T05:33:38.440Z',
                Id: 'image-123456789',
            }),
        }),
    };

    // Fake conf
    docker.configuration = {
        watchbydefault: true,
    };
    const spylog = jest.spyOn(docker.log, 'warn');
    docker.watchContainer = () => { throw new Error('Failure!!!'); };
    expect(await docker.watch()).toEqual([]);
    expect(spylog).toHaveBeenCalledWith('Error when processing some containers (Failure!!!)');
});

test('watch should log error when an error occurs when listing containers fails', async () => {
    docker.getContainers = () => { throw new Error('Failure!!!'); };
    const spylog = jest.spyOn(docker.log, 'warn');
    expect(await docker.watch()).toEqual([]);
    expect(spylog).toHaveBeenCalledWith('Error when trying to get the list of the containers to watch (Failure!!!)');
});

const stubLogger = { info: () => {}, debug: () => {}, warn: () => {} };

test('carryUpdateState should transfer metadata and set success notification on target match', () => {
    const carryUpdateState = Docker.__get__('carryUpdateState');
    const oldRow = { includeTags: '^\\d+$', updateKind: { remoteValue: '2.0.0' } };
    const newLive = { name: 'test', image: { tag: { value: '2.0.0' } } };
    carryUpdateState(oldRow, newLive);
    expect(newLive.includeTags).toEqual('^\\d+$');
    expect(newLive.notification).toEqual(expect.objectContaining({ level: 'success' }));
});

test('carryUpdateState should not set notification when tag does not match target', () => {
    const carryUpdateState = Docker.__get__('carryUpdateState');
    const oldRow = { updateKind: { remoteValue: '2.0.0' } };
    const newLive = { name: 'test', image: { tag: { value: '1.0.0' } } };
    carryUpdateState(oldRow, newLive);
    expect(newLive.notification).toBeUndefined();
});

test('reconcileStore should prune store rows that are no longer live', () => {
    const reconcileStore = Docker.__get__('reconcileStore');
    jest.spyOn(storeContainer, 'getContainers').mockReturnValue([
        { id: '1', name: 'a' },
        { id: '2', name: 'b' },
    ]);
    const spyDelete = jest.spyOn(storeContainer, 'deleteContainer').mockImplementation(() => {});
    reconcileStore('local', [{ id: '1', name: 'a' }], stubLogger);
    expect(spyDelete).toHaveBeenCalledWith('2');
    expect(spyDelete).toHaveBeenCalledTimes(1);
});

test('reconcileStore should carry state forward on recreation then prune old row', () => {
    const reconcileStore = Docker.__get__('reconcileStore');
    jest.spyOn(storeContainer, 'getContainers').mockReturnValue([
        {
            id: 'old', name: 'a', updateKind: { remoteValue: '2.0.0' }, includeTags: 'x',
        },
    ]);
    const spyDelete = jest.spyOn(storeContainer, 'deleteContainer').mockImplementation(() => {});
    const live = { id: 'new', name: 'a', image: { tag: { value: '2.0.0' } } };
    reconcileStore('local', [live], stubLogger);
    expect(spyDelete).toHaveBeenCalledWith('old');
    expect(live.includeTags).toEqual('x');
    expect(live.notification.level).toEqual('success');
});

test('getRegistries should return all registered registries when called', () => {
    expect(Object.keys(Docker.__get__('getRegistries')())).toEqual(['acr', 'ecr', 'gcr', 'hub']);
});

test('getRegistry should return all registered registries when called', () => {
    expect(Docker.__get__('getRegistry')('acr')).toBeDefined();
});

test('getRegistry should return all registered registries when called', () => {
    expect(() => Docker.__get__('getRegistry')('registry_fail')).toThrowError('Unsupported Registry registry_fail');
});

test('mapContainerToContainerReport should not emit event when no update available', () => {
    const containerWithResult = {
        id: 'container-123456789',
        updateAvailable: false,
    };
    storeContainer.getContainer = () => (undefined);
    storeContainer.insertContainer = () => (containerWithResult);
    expect(docker.mapContainerToContainerReport(containerWithResult)).toEqual({
        changed: true,
        container: {
            id: 'container-123456789',
            updateAvailable: false,
        },
    });
});

const containerToWatchTestCases = [{
    label: undefined,
    default: true,
    result: true,
}, {
    label: '',
    default: true,
    result: true,
}, {
    label: 'true',
    default: true,
    result: true,
}, {
    label: 'false',
    default: true,
    result: false,
}, {
    label: undefined,
    default: false,
    result: false,
}, {
    label: '',
    default: false,
    result: false,
}, {
    label: 'true',
    default: false,
    result: true,
}, {
    label: 'false',
    default: false,
    result: false,
}];

test.each(containerToWatchTestCases)(
    'isContainerToWatch should return $result when hosaka.watch label = $label and watchbydefault = $default ',
    (item) => {
        const isContainerToWatch = Docker.__get__('isContainerToWatch');
        expect(isContainerToWatch(item.label, item.default)).toEqual(item.result);
    },
);

const digestToWatchTestCases = [{
    label: undefined,
    semver: false,
    result: true,
}, {
    label: '',
    semver: false,
    result: true,
}, {
    label: 'true',
    semver: false,
    result: true,
}, {
    label: 'false',
    semver: false,
    result: false,
}, {
    label: undefined,
    semver: true,
    result: false,
}, {
    label: '',
    semver: true,
    result: false,
}, {
    label: 'true',
    semver: true,
    result: true,
}, {
    label: 'false',
    semver: true,
    result: false,
}];

test.each(digestToWatchTestCases)(
    'isDigestToWatch should return $result when hosaka.watch label = $label and semver = semver ',
    (item) => {
        const isDigestToWatch = Docker.__get__('isDigestToWatch');
        expect(isDigestToWatch(item.label, item.semver)).toEqual(item.result);
    },
);
