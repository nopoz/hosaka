const { ValidationError } = require('joi');
const event = require('../../event');
const log = require('../../log');
const Trigger = require('./Trigger');

jest.mock('../../log');
jest.mock('../../event');
jest.mock('../../prometheus/trigger', () => ({
    getTriggerCounter: () => ({
        inc: () => ({}),
    }),
}));

let trigger;

const configurationValid = {
    threshold: 'all',
    once: true,
    mode: 'simple',
    // eslint-disable-next-line no-template-curly-in-string
    simpletitle: 'New ${kind} found for container ${name}',
    // eslint-disable-next-line no-template-curly-in-string
    simplebody: 'Container ${name} running with ${kind} ${local} can be updated to ${kind} ${remote}\n${link}',
    // eslint-disable-next-line no-template-curly-in-string
    batchtitle: '${count} updates available',
};

beforeEach(() => {
    jest.resetAllMocks();
    trigger = new Trigger();
    trigger.log = log;
    trigger.configuration = { ...configurationValid };
});

test('validateConfiguration should return validated configuration when valid', () => {
    const validatedConfiguration = trigger.validateConfiguration(configurationValid);
    expect(validatedConfiguration).toStrictEqual(configurationValid);
});

test('validateConfiguration should throw error when invalid', () => {
    const configuration = {
        url: 'git://xxx.com',
    };
    expect(() => {
        trigger.validateConfiguration(configuration);
    }).toThrowError(ValidationError);
});

test('init should register to container report when simple mode enabled', async () => {
    const spy = jest.spyOn(event, 'registerContainerReport');
    await trigger.init();
    expect(spy).toHaveBeenCalled();
});

test('init should register to container reports when batch mode enabled', async () => {
    const spy = jest.spyOn(event, 'registerContainerReports');
    trigger.configuration.mode = 'batch';
    await trigger.init();
    expect(spy).toHaveBeenCalled();
});

const handleContainerReportTestCases = [{
    shouldTrigger: true,
    threshold: 'all',
    once: true,
    changed: true,
    updateAvailable: true,
    semverDiff: 'major',
}, {
    shouldTrigger: true,
    threshold: 'all',
    once: false,
    changed: false,
    updateAvailable: true,
    semverDiff: 'major',
}, {
    shouldTrigger: false,
    threshold: 'minor',
    once: true,
    changed: true,
    updateAvailable: true,
    semverDiff: 'major',
}, {
    shouldTrigger: false,
    threshold: 'minor',
    once: false,
    changed: false,
    updateAvailable: true,
    semverDiff: 'major',
}, {
    shouldTrigger: false,
    threshold: 'minor',
    once: false,
    changed: true,
    updateAvailable: false,
    semverDiff: 'major',
}];

test.each(handleContainerReportTestCases)(
    'handleContainerReport should call trigger? ($shouldTrigger) when changed=$changed and updateAvailable=$updateAvailable and threshold=$threshold',
    async (item) => {
        trigger.configuration = {
            threshold: item.threshold,
            once: item.once,
            mode: 'simple',
        };
        await trigger.init();

        const spy = jest.spyOn(trigger, 'trigger');
        await trigger.handleContainerReport({
            changed: item.changed,
            container: {
                name: 'container1',
                updateAvailable: item.updateAvailable,
                updateKind: {
                    kind: 'tag',
                    semverDiff: item.semverDiff,
                },
            },
        });
        if (item.shouldTrigger) {
            expect(spy).toHaveBeenCalledWith({
                name: 'container1',
                updateAvailable: item.updateAvailable,
                updateKind: {
                    kind: 'tag',
                    semverDiff: item.semverDiff,
                },
            });
        } else {
            expect(spy).not.toHaveBeenCalled();
        }
    },
);

test('handleContainerReport should warn when trigger method of the trigger fails', async () => {
    trigger.configuration = {
        threshold: 'all',
        mode: 'simple',
    };
    trigger.trigger = () => { throw new Error('Fail!!!'); };
    await trigger.init();
    const spyLog = jest.spyOn(log, 'warn');
    await trigger.handleContainerReport({
        changed: true,
        container: {
            name: 'container1',
            updateAvailable: true,
        },
    });
    expect(spyLog).toHaveBeenCalledWith('Error (Fail!!!)');
});

const handleContainerReportsTestCases = [{
    shouldTrigger: true,
    threshold: 'all',
    once: true,
    changed: true,
    updateAvailable: true,
    semverDiff: 'major',
}, {
    shouldTrigger: true,
    threshold: 'all',
    once: false,
    changed: false,
    updateAvailable: true,
    semverDiff: 'major',
}, {
    shouldTrigger: false,
    threshold: 'minor',
    once: true,
    changed: true,
    updateAvailable: true,
    semverDiff: 'major',
}, {
    shouldTrigger: false,
    threshold: 'minor',
    once: false,
    changed: false,
    updateAvailable: true,
    semverDiff: 'major',
}, {
    shouldTrigger: false,
    threshold: 'minor',
    once: false,
    changed: true,
    updateAvailable: false,
    semverDiff: 'major',
}];

test.each(handleContainerReportsTestCases)(
    'handleContainerReports should call triggerBatch? ($shouldTrigger) when changed=$changed and updateAvailable=$updateAvailable and threshold=$threshold',
    async (item) => {
        trigger.configuration = {
            threshold: item.threshold,
            once: item.once,
            mode: 'simple',
        };
        await trigger.init();

        const spy = jest.spyOn(trigger, 'triggerBatch');
        await trigger.handleContainerReports([
            {
                changed: item.changed,
                container: {
                    name: 'container1',
                    updateAvailable: item.updateAvailable,
                    updateKind: {
                        kind: 'tag',
                        semverDiff: item.semverDiff,
                    },
                },
            },
        ]);
        if (item.shouldTrigger) {
            expect(spy).toHaveBeenCalledWith([{
                name: 'container1',
                updateAvailable: item.updateAvailable,
                updateKind: {
                    kind: 'tag',
                    semverDiff: item.semverDiff,
                },
            }]);
        } else {
            expect(spy).not.toHaveBeenCalled();
        }
    },
);

const isThresholdReachedTestCases = [{
    result: true,
    threshold: 'all',
    change: undefined,
    kind: 'tag',
}, {
    result: true,
    threshold: 'major',
    change: 'major',
    kind: 'tag',
}, {
    result: true,
    threshold: 'major',
    change: 'minor',
    kind: 'tag',
}, {
    result: true,
    threshold: 'major',
    change: 'patch',
    kind: 'tag',
}, {
    result: false,
    threshold: 'minor',
    change: 'major',
    kind: 'tag',
}, {
    result: true,
    threshold: 'minor',
    change: 'minor',
    kind: 'tag',
}, {
    result: true,
    threshold: 'minor',
    change: 'patch',
    kind: 'tag',
}, {
    result: false,
    threshold: 'patch',
    change: 'major',
    kind: 'tag',
}, {
    result: false,
    threshold: 'patch',
    change: 'minor',
    kind: 'tag',
}, {
    result: true,
    threshold: 'patch',
    change: 'patch',
    kind: 'tag',
}, {
    result: true,
    threshold: 'all',
    change: 'unknown',
    kind: 'digest',
}, {
    result: true,
    threshold: 'major',
    change: 'unknown',
    kind: 'digest',
}, {
    result: true,
    threshold: 'minor',
    change: 'unknown',
    kind: 'digest',
}, {
    result: true,
    threshold: 'patch',
    change: 'unknown',
    kind: 'digest',
}];

test.each(isThresholdReachedTestCases)(
    'isThresholdReached should return $result when threshold is $threshold and change is $change',
    (item) => {
        trigger.configuration = {
            threshold: item.threshold,
        };
        expect(trigger.isThresholdReached({
            updateKind: {
                kind: item.kind,
                semverDiff: item.change,
            },
        })).toEqual(item.result);
    },
);

test('isThresholdReached should return true when there is no semverDiff regardless of the threshold', async () => {
    trigger.configuration = {
        threshold: 'all',
    };
    expect(trigger.isThresholdReached({
        updateKind: { kind: 'digest' },
    })).toBeTruthy();
});

test('renderSimpleTitle should replace placeholders when called', async () => {
    expect(trigger.renderSimpleTitle({
        name: 'container-name',
        updateKind: {
            kind: 'tag',
        },
    })).toEqual('New tag found for container container-name');
});

test('renderSimpleBody should replace placeholders when called', async () => {
    expect(trigger.renderSimpleBody({
        name: 'container-name',
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
        result: {
            link: 'http://test',
        },
    })).toEqual('Container container-name running with tag 1.0.0 can be updated to tag 2.0.0\nhttp://test');
});

test('renderSimpleBody should replace placeholders when template is a customized one', async () => {
    // eslint-disable-next-line no-template-curly-in-string
    trigger.configuration.simplebody = 'Watcher ${watcher} reports container ${name} available update';
    expect(trigger.renderSimpleBody({
        name: 'container-name',
        watcher: 'DUMMY',
    })).toEqual('Watcher DUMMY reports container container-name available update');
});

test('renderBatchTitle should replace placeholders when called', async () => {
    expect(trigger.renderBatchTitle([{
        name: 'container-name',
        updateKind: {
            kind: 'tag',
        },
    }])).toEqual('1 updates available');
});

test('renderBatchBody should replace placeholders when called', async () => {
    expect(trigger.renderBatchBody([{
        name: 'container-name',
        updateKind: {
            kind: 'tag',
            localValue: '1.0.0',
            remoteValue: '2.0.0',
        },
        result: {
            link: 'http://test',
        },
    }])).toEqual('- Container container-name running with tag 1.0.0 can be updated to tag 2.0.0\nhttp://test\n');
});

test('parseIncludeOrExcludeTriggerString parses id and threshold', () => {
    expect(Trigger.parseIncludeOrExcludeTriggerString('trigger.smtp.main'))
        .toEqual({ id: 'trigger.smtp.main', threshold: 'all' });
    expect(Trigger.parseIncludeOrExcludeTriggerString('trigger.smtp.main:minor'))
        .toEqual({ id: 'trigger.smtp.main', threshold: 'minor' });
    expect(Trigger.parseIncludeOrExcludeTriggerString('trigger.smtp.main:major-only'))
        .toEqual({ id: 'trigger.smtp.main', threshold: 'major-only' });
    expect(Trigger.parseIncludeOrExcludeTriggerString('trigger.smtp.main:bogus'))
        .toEqual({ id: 'trigger.smtp.main', threshold: 'all' });
});

const isThresholdReachedOverrideTestCases = [
    { threshold: 'major-only', semverDiff: 'major', expected: true },
    { threshold: 'major-only', semverDiff: 'minor', expected: false },
    { threshold: 'minor-only', semverDiff: 'minor', expected: true },
    { threshold: 'minor-only', semverDiff: 'major', expected: false },
    { threshold: 'minor', semverDiff: 'major', expected: false },
    { threshold: 'minor', semverDiff: 'minor', expected: true },
    { threshold: 'minor', semverDiff: 'patch', expected: true },
    { threshold: 'patch', semverDiff: 'minor', expected: false },
    { threshold: 'patch', semverDiff: 'patch', expected: true },
    { threshold: 'all', semverDiff: 'major', expected: true },
];

test.each(isThresholdReachedOverrideTestCases)(
    'isThresholdReached($threshold, $semverDiff) === $expected',
    ({ threshold, semverDiff, expected }) => {
        const container = { updateKind: { kind: 'tag', semverDiff } };
        expect(trigger.isThresholdReached(container, threshold)).toEqual(expected);
    },
);

const mustTriggerTestCases = [
    // no labels => fires
    { triggerInclude: undefined, triggerExclude: undefined, expected: true },
    // include matches this trigger id => fires
    { triggerInclude: 'trigger.mock.mock', triggerExclude: undefined, expected: true },
    // include does not match => does not fire
    { triggerInclude: 'trigger.other.x', triggerExclude: undefined, expected: false },
    // exclude matches this trigger id => does not fire
    { triggerInclude: undefined, triggerExclude: 'trigger.mock.mock', expected: false },
    // include with cumulative ':minor' and a patch update => fires (minor covers patch)
    {
        triggerInclude: 'trigger.mock.mock:minor', triggerExclude: undefined, semverDiff: 'patch', expected: true,
    },
    // include with ':patch' and a major update => does not fire (threshold not reached)
    {
        triggerInclude: 'trigger.mock.mock:patch', triggerExclude: undefined, semverDiff: 'major', expected: false,
    },
    // include with exact ':minor-only' and a patch update => does not fire
    {
        triggerInclude: 'trigger.mock.mock:minor-only', triggerExclude: undefined, semverDiff: 'patch', expected: false,
    },
    // exclude with ':major-only' and a minor update => still fires (exclude threshold not reached)
    {
        triggerInclude: undefined, triggerExclude: 'trigger.mock.mock:major-only', semverDiff: 'minor', expected: true,
    },
    // case-insensitive id match
    { triggerInclude: 'TRIGGER.MOCK.MOCK', triggerExclude: undefined, expected: true },
];

test.each(mustTriggerTestCases)(
    'mustTrigger include=$triggerInclude exclude=$triggerExclude => $expected',
    ({
        triggerInclude, triggerExclude, semverDiff, expected,
    }) => {
        trigger.kind = 'trigger';
        trigger.type = 'mock';
        trigger.name = 'mock';
        const container = {
            triggerInclude,
            triggerExclude,
            updateKind: { kind: 'tag', semverDiff: semverDiff || 'major' },
        };
        expect(trigger.mustTrigger(container)).toEqual(expected);
    },
);
