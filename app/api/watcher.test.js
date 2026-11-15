const registry = require('../registry');

jest.mock('../registry');
const { getUnreachableWatcherNames } = require('./watcher');

test('getUnreachableWatcherNames returns only watchers whose last listing failed', () => {
    registry.getState.mockReturnValue({
        watcher: {
            'docker.local': { name: 'local', getStatus: () => ({ reachable: true }) },
            'docker.desktop': {
                name: 'desktop',
                getStatus: () => ({ reachable: false, unreachableSince: '2026-11-14T00:00:00.000Z', error: 'down' }),
            },
            'other.legacy': { name: 'legacy' },
        },
    });
    expect([...getUnreachableWatcherNames()]).toStrictEqual(['desktop']);
});
