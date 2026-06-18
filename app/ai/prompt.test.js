const { buildPrompt, RESPONSE_SCHEMA } = require('./prompt');

test('buildPrompt embeds image, versions and notes', () => {
    const container = {
        image: { name: 'nopoz/hosaka', tag: { value: 'v1.2.2' } },
        result: { tag: 'v1.4.2' },
    };
    const notes = [{ tag: 'v1.4.0', date: '2026-01-01', body: 'Added a dark mode' }];
    const { system, user, schema } = buildPrompt(container, notes);
    expect(user).toContain('nopoz/hosaka');
    expect(user).toContain('v1.2.2');
    expect(user).toContain('v1.4.2');
    expect(user).toContain('v1.4.0');
    expect(user).toContain('Added a dark mode');
    expect(system.toLowerCase()).toContain('breaking');
    expect(schema).toBe(RESPONSE_SCHEMA);
});

test('RESPONSE_SCHEMA declares the structured fields', () => {
    expect(Object.keys(RESPONSE_SCHEMA.properties)).toStrictEqual([
        'riskLevel', 'breakingChanges', 'highlights', 'overview', 'versionsCovered',
    ]);
});

test('RESPONSE_SCHEMA constrains riskLevel to an enum and requires core fields', () => {
    expect(RESPONSE_SCHEMA.properties.riskLevel.enum).toStrictEqual(['none', 'low', 'medium', 'high']);
    expect(RESPONSE_SCHEMA.required).toEqual(expect.arrayContaining(['riskLevel', 'overview']));
});

test('RESPONSE_SCHEMA carries optional version refs on changes', () => {
    expect(RESPONSE_SCHEMA.properties.breakingChanges.items.properties.version.type).toBe('string');
    expect(RESPONSE_SCHEMA.properties.highlights.items.properties.version.type).toBe('string');
    expect(RESPONSE_SCHEMA.properties.highlights.items.properties.text.type).toBe('string');
});

test('system prompt forbids meta-reasoning and frames the version range', () => {
    const container = {
        image: { name: 'x/y', tag: { value: 'v1' } },
        result: { tag: 'v2' },
    };
    const { system } = buildPrompt(container, []);
    expect(system.toLowerCase()).toContain('do not include your reasoning');
    expect(system.toLowerCase()).toContain('do not question');
});

test('buildPrompt truncates an over-long note body', () => {
    const container = {
        image: { name: 'x/y', tag: { value: 'v1' } },
        result: { tag: 'v2' },
    };
    const { user } = buildPrompt(container, [{ tag: 'v2', date: null, body: 'a'.repeat(9000) }]);
    expect(user).toContain('[truncated]');
});

test('buildPrompt drops oldest notes past the total budget', () => {
    const container = {
        image: { name: 'x/y', tag: { value: 'v1' } },
        result: { tag: 'v9' },
    };
    const notes = Array.from({ length: 30 }, (unused, i) => ({ tag: `v${i}`, date: null, body: 'z'.repeat(3000) }));
    const { user, dropped } = buildPrompt(container, notes);
    expect(dropped).toBeGreaterThan(0);
    expect(user.length).toBeLessThanOrEqual(21000);
});
