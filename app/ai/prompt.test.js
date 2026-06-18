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
