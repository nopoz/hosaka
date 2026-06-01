const { exec } = require('child_process');
const event = require('../../../event');
const storeContainer = require('../../../store/container');

jest.mock('child_process');
jest.mock('../../../event');
jest.mock('../../../store/container');

const Script = require('./Script');

const script = new Script();

const configurationValid = {
    path: '/path/to/script.sh',
    install: true,
    timeout: 300000,
};

beforeEach(() => {
    jest.resetAllMocks();

    // The trigger logs through this.log (set by the component base at init,
    // which the tests don't run) and through console; stub both so assertions
    // can target them and the suite stays quiet.
    script.log = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        child: jest.fn(),
    };
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Default exec mock: invoke the callback with success and return a process
    // whose stream/close handlers can be driven by the test.
    exec.mockImplementation((command, options, callback) => {
        callback(null, 'success', '');
        return {
            stdout: { on: jest.fn() },
            stderr: { on: jest.fn() },
            on: jest.fn((evt, handler) => handler(0)),
        };
    });

    storeContainer.getContainer.mockImplementation((id) => ({
        id,
        name: 'test-container',
        image: { id: 'old-image-id' },
        status: 'running',
    }));
    storeContainer.getContainers.mockImplementation(() => []);
    storeContainer.updateContainer.mockImplementation((container) => container);
    storeContainer.deleteContainer.mockImplementation(() => true);
});

describe('Script Trigger Tests', () => {
    test('triggerBatch should reject batch operations', async () => {
        script.configuration = configurationValid;
        const containers = [
            { name: 'container1' },
            { name: 'container2' },
        ];

        await script.triggerBatch(containers);

        // Verify warning was logged
        expect(script.log.warn).toHaveBeenCalledWith(
            'Batch operations are not supported by the Script trigger - use individual container triggers instead',
        );
        // Verify script was not executed
        expect(exec).not.toHaveBeenCalled();
    });

    test('cleanupExistingContainers should delete old containers and verify removal', async () => {
        script.configuration = configurationValid;
        const container = {
            name: 'test-container',
            watcher: 'docker',
        };

        // One container is always preserved (the best running/up-to-date one),
        // so deletion only happens when a second, stale row exists. Back the
        // store with a small stateful set so deleteContainer actually removes
        // the row and the cleanup loop converges instead of retrying.
        let storeRows = [
            {
                id: 'container1', name: 'test-container', watcher: 'docker', status: 'exited',
            },
            {
                id: 'keep', name: 'test-container', watcher: 'docker', status: 'running', updateAvailable: false,
            },
        ];
        storeContainer.getContainers.mockImplementation(() => storeRows.slice());
        storeContainer.deleteContainer.mockImplementation((id) => {
            storeRows = storeRows.filter((r) => r.id !== id);
            return true;
        });
        storeContainer.getContainer.mockImplementation(
            (id) => storeRows.find((r) => r.id === id),
        );

        await script.cleanupExistingContainers(container);

        expect(storeContainer.deleteContainer).toHaveBeenCalledWith('container1');
        // Removal is verified by a follow-up store read.
        expect(storeContainer.getContainer).toHaveBeenCalledWith('container1');
    });

    test('waitForContainerImageUpdate should detect new container', async () => {
        script.configuration = configurationValid;
        const container = {
            name: 'test-container',
            watcher: 'docker',
            image: { id: 'old-image-id' },
        };

        // The method polls the watcher's Docker API (not the store) for a new
        // running container, then waits for a watch cycle before reading the
        // store. Stub the Docker API, the watcher-stop event and the store read.
        const fakeDockerApi = {
            listContainers: jest.fn().mockResolvedValue([{ Id: 'new-container' }]),
            getContainer: jest.fn(() => ({
                inspect: jest.fn().mockResolvedValue({
                    State: { Status: 'running' },
                    Image: 'new-image-id',
                }),
            })),
        };
        script.getDockerApiForWatcher = jest.fn(() => fakeDockerApi);
        event.registerWatcherStop.mockImplementation((cb) => cb({ name: 'watcher.docker.docker' }));
        storeContainer.getContainer.mockImplementation((id) => ({
            id,
            name: 'test-container',
            status: 'running',
            image: { id: 'new-image-id' },
            watcher: 'docker',
        }));

        const result = await script.waitForContainerImageUpdate(container, 'old-image-id');

        expect(result).toBeDefined();
        expect(result.image.id).toBe('new-image-id');
        expect(event.emitTriggerWatch).toHaveBeenCalled();
    });

    test('executeScript should properly handle and log script output', async () => {
        script.configuration = configurationValid;
        const container = {
            name: 'test-container',
            image: { name: 'test-image' },
            watcher: 'docker',
            updateKind: {
                localValue: '1.0.0',
                remoteValue: '1.0.1',
            },
        };

        // Mock exec with streaming output
        exec.mockImplementation((command, options, callback) => {
            const mockProcess = {
                stdout: {
                    on: jest.fn((evt, handler) => {
                        handler('Script is running\n');
                        handler('Progress: 50%\n');
                        handler('Complete\n');
                    }),
                },
                stderr: { on: jest.fn() },
                on: jest.fn((evt, handler) => handler(0)),
            };
            callback(null, 'success', '');
            return mockProcess;
        });

        await script.executeScript(container, 'install');

        const execCall = exec.mock.results[0].value;
        expect(execCall.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
        // Verify log messages were prefixed with container name
        expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[test-container]'));
    });

    test('setContainerNotification should update container with notification', async () => {
        const container = {
            id: 'test-container',
            name: 'test-container',
        };

        script.setContainerNotification(container, 'Test message', 'info');

        expect(storeContainer.updateContainer).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'test-container',
                notification: {
                    message: 'Test message',
                    level: 'info',
                },
            }),
        );
    });
});
