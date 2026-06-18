const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        riskLevel: { type: 'string' },
        breakingChanges: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    detail: { type: 'string' },
                },
            },
        },
        highlights: { type: 'array', items: { type: 'string' } },
        overview: { type: 'string' },
        versionsCovered: { type: 'array', items: { type: 'string' } },
    },
};

/**
 * Build the Gemini prompt for an update analysis.
 * @param {Object} container
 * @param {Array<{tag,date,body}>} notes
 * @returns {{system: string, user: string, schema: Object}}
 */
function buildPrompt(container, notes) {
    const image = container.image.name;
    const current = container.image.tag.value;
    const target = container.result.tag;
    const system = [
        'You are a release-notes analyst for container image upgrades.',
        'Summarize what changed between the current version and the target version,',
        'and flag any potentially breaking changes such as renamed or removed config/env',
        'keys, changed volume or data layouts, API/CLI changes, dropped platforms, or',
        'required manual migration steps.',
        'riskLevel must be one of: none, low, medium, high.',
        'Be concise and specific. Use only the provided release notes; never invent changes.',
    ].join(' ');
    const notesText = notes
        .map((note) => {
            const header = note.date ? `## ${note.tag} (${note.date})` : `## ${note.tag}`;
            return `${header}\n${note.body || ''}`;
        })
        .join('\n\n');
    const user = [
        `Image: ${image}`,
        `Current version: ${current}`,
        `Target version: ${target}`,
        '',
        'Release notes:',
        notesText,
    ].join('\n');
    return { system, user, schema: RESPONSE_SCHEMA };
}

module.exports = {
    buildPrompt,
    RESPONSE_SCHEMA,
};
