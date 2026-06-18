const configuration = require('./index');

test('getVersion should return hosaka version', () => {
    configuration.hosakaEnvVars.HOSAKA_VERSION = 'x.y.z';
    expect(configuration.getVersion()).toStrictEqual('x.y.z');
});

test('getLogLevel should return info by default', () => {
    delete configuration.hosakaEnvVars.HOSAKA_LOG_LEVEL;
    expect(configuration.getLogLevel()).toStrictEqual('info');
});

test('getLogLevel should return debug when overridden', () => {
    configuration.hosakaEnvVars.HOSAKA_LOG_LEVEL = 'debug';
    expect(configuration.getLogLevel()).toStrictEqual('debug');
});

test('getWatcherConfiguration should return empty object by default', () => {
    delete configuration.hosakaEnvVars.HOSAKA_WATCHER_WATCHER1_X;
    delete configuration.hosakaEnvVars.HOSAKA_WATCHER_WATCHER1_Y;
    delete configuration.hosakaEnvVars.HOSAKA_WATCHER_WATCHER2_X;
    delete configuration.hosakaEnvVars.HOSAKA_WATCHER_WATCHER2_Y;
    expect(configuration.getWatcherConfigurations()).toStrictEqual({});
});

test('getWatcherConfiguration should return configured watchers when overridden', () => {
    configuration.hosakaEnvVars.HOSAKA_WATCHER_WATCHER1_X = 'x';
    configuration.hosakaEnvVars.HOSAKA_WATCHER_WATCHER1_Y = 'y';
    configuration.hosakaEnvVars.HOSAKA_WATCHER_WATCHER2_X = 'x';
    configuration.hosakaEnvVars.HOSAKA_WATCHER_WATCHER2_Y = 'y';
    expect(configuration.getWatcherConfigurations()).toStrictEqual({
        watcher1: { x: 'x', y: 'y' },
        watcher2: { x: 'x', y: 'y' },
    });
});

test('getTriggerConfigurations should return empty object by default', () => {
    delete configuration.hosakaEnvVars.HOSAKA_TRIGGER_TRIGGER1_X;
    delete configuration.hosakaEnvVars.HOSAKA_TRIGGER_TRIGGER1_Y;
    delete configuration.hosakaEnvVars.HOSAKA_TRIGGER_TRIGGER2_X;
    delete configuration.hosakaEnvVars.HOSAKA_TRIGGER_TRIGGER2_Y;
    expect(configuration.getTriggerConfigurations()).toStrictEqual({});
});

test('getTriggerConfigurations should return configured triggers when overridden', () => {
    configuration.hosakaEnvVars.HOSAKA_TRIGGER_TRIGGER1_X = 'x';
    configuration.hosakaEnvVars.HOSAKA_TRIGGER_TRIGGER1_Y = 'y';
    configuration.hosakaEnvVars.HOSAKA_TRIGGER_TRIGGER2_X = 'x';
    configuration.hosakaEnvVars.HOSAKA_TRIGGER_TRIGGER2_Y = 'y';
    expect(configuration.getTriggerConfigurations()).toStrictEqual({
        trigger1: { x: 'x', y: 'y' },
        trigger2: { x: 'x', y: 'y' },
    });
});

test('getRegistryConfigurations should return empty object by default', () => {
    delete configuration.hosakaEnvVars.HOSAKA_REGISTRY_REGISTRY1_X;
    delete configuration.hosakaEnvVars.HOSAKA_REGISTRY_REGISTRY1_Y;
    delete configuration.hosakaEnvVars.HOSAKA_REGISTRY_REGISTRY1_X;
    delete configuration.hosakaEnvVars.HOSAKA_REGISTRY_REGISTRY1_Y;
    expect(configuration.getRegistryConfigurations()).toStrictEqual({});
});

test('getRegistryConfigurations should return configured registries when overridden', () => {
    configuration.hosakaEnvVars.HOSAKA_REGISTRY_REGISTRY1_X = 'x';
    configuration.hosakaEnvVars.HOSAKA_REGISTRY_REGISTRY1_Y = 'y';
    configuration.hosakaEnvVars.HOSAKA_REGISTRY_REGISTRY2_X = 'x';
    configuration.hosakaEnvVars.HOSAKA_REGISTRY_REGISTRY2_Y = 'y';
    expect(configuration.getRegistryConfigurations()).toStrictEqual({
        registry1: { x: 'x', y: 'y' },
        registry2: { x: 'x', y: 'y' },
    });
});

test('getStoreConfiguration should return configured store', () => {
    configuration.hosakaEnvVars.HOSAKA_STORE_X = 'x';
    configuration.hosakaEnvVars.HOSAKA_STORE_Y = 'y';
    expect(configuration.getStoreConfiguration()).toStrictEqual({ x: 'x', y: 'y' });
});

test('getServerConfiguration should return configured api (new vars)', () => {
    configuration.hosakaEnvVars.HOSAKA_SERVER_PORT = '4000';
    expect(configuration.getServerConfiguration()).toStrictEqual({
        cookie: {},
        cors: {},
        enabled: true,
        feature: {
            delete: true,
        },
        port: 4000,
        tls: {},
    });
});

test('replaceSecrets must read secret in file', () => {
    const vars = {
        HOSAKA_SERVER_X__FILE: `${__dirname}/secret.txt`,
    };
    configuration.replaceSecrets(vars);
    expect(vars).toStrictEqual({
        HOSAKA_SERVER_X: 'super_secret',
    });
});

test('getAiConfiguration returns defaults and disabled when no key', () => {
    delete configuration.hosakaEnvVars.HOSAKA_AI_PROVIDER;
    delete configuration.hosakaEnvVars.HOSAKA_AI_GEMINI_APIKEY;
    delete configuration.hosakaEnvVars.HOSAKA_AI_GEMINI_MODEL;
    delete configuration.hosakaEnvVars.HOSAKA_AI_GITHUB_TOKEN;
    expect(configuration.getAiConfiguration()).toStrictEqual({
        provider: 'gemini',
        gemini: { apikey: '', model: 'gemini-2.5-flash-lite' },
        github: { token: '' },
        enabled: false,
    });
});

test('getAiConfiguration is enabled when an api key is set', () => {
    configuration.hosakaEnvVars.HOSAKA_AI_GEMINI_APIKEY = 'secret';
    const config = configuration.getAiConfiguration();
    expect(config.enabled).toBe(true);
    expect(config.gemini.apikey).toBe('secret');
    delete configuration.hosakaEnvVars.HOSAKA_AI_GEMINI_APIKEY;
});

test('getAiPublicConfiguration omits the api key and token', () => {
    configuration.hosakaEnvVars.HOSAKA_AI_GEMINI_APIKEY = 'secret';
    configuration.hosakaEnvVars.HOSAKA_AI_GEMINI_MODEL = 'gemini-2.5-flash';
    expect(configuration.getAiPublicConfiguration()).toStrictEqual({
        enabled: true,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
    });
    delete configuration.hosakaEnvVars.HOSAKA_AI_GEMINI_APIKEY;
    delete configuration.hosakaEnvVars.HOSAKA_AI_GEMINI_MODEL;
});
