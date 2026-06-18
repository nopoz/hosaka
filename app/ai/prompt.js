// Bound the prompt so a noisy image (many releases, huge bodies) can't blow up
// latency or cost. Per-note first, then an overall budget keeping the most
// recent notes (closest to the target) that fit.
const MAX_NOTE_CHARS = 4000;
const MAX_TOTAL_CHARS = 20000;

const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        riskLevel: {
            type: 'string',
            enum: ['none', 'low', 'medium', 'high'],
            description: 'Overall upgrade risk: high if manual migration or breaking config/data changes are required, none if purely additive/bugfix.',
        },
        breakingChanges: {
            type: 'array',
            description: 'Changes that can break an existing deployment. Empty if none.',
            items: {
                type: 'object',
                properties: {
                    title: {
                        type: 'string',
                        description: 'Short label for the breaking change (a few words).',
                    },
                    detail: {
                        type: 'string',
                        description: 'One concise factual sentence: what changed and the action the user must take. No reasoning, no commentary, no questions.',
                    },
                    version: {
                        type: 'string',
                        description: 'The exact version tag from the notes where this change appears, if identifiable. Omit if unclear.',
                    },
                },
                required: ['title', 'detail'],
            },
        },
        highlights: {
            type: 'array',
            description: 'Notable non-breaking changes.',
            items: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: 'One short sentence describing the change.',
                    },
                    version: {
                        type: 'string',
                        description: 'The exact version tag from the notes where this change appears, if identifiable. Omit if unclear.',
                    },
                },
            },
        },
        overview: {
            type: 'string',
            description: 'Two or three plain sentences summarizing the upgrade.',
        },
        versionsCovered: {
            type: 'array',
            description: 'The version tags these notes cover.',
            items: { type: 'string' },
        },
    },
    required: ['riskLevel', 'overview'],
};

/**
 * Truncate each note body, then keep the most recent notes (input is sorted
 * oldest-first) that fit the total budget.
 * @returns {{kept: Array, dropped: number}}
 */
function capNotes(notes) {
    const truncated = notes.map((note) => {
        const body = note.body || '';
        return body.length > MAX_NOTE_CHARS
            ? { ...note, body: `${body.slice(0, MAX_NOTE_CHARS)}\n...[truncated]` }
            : note;
    });
    const kept = [];
    let total = 0;
    for (let i = truncated.length - 1; i >= 0; i -= 1) {
        const len = (truncated[i].body || '').length;
        if (total + len > MAX_TOTAL_CHARS && kept.length) {
            break;
        }
        total += len;
        kept.unshift(truncated[i]);
    }
    return { kept, dropped: notes.length - kept.length };
}

/**
 * Build the Gemini prompt for an update analysis. Returns the (possibly capped)
 * notes that were actually sent so the caller can log what was used.
 * @param {Object} container
 * @param {Array<{tag,date,body}>} notes
 * @returns {{system: string, user: string, schema: Object, dropped: number, chars: number}}
 */
function buildPrompt(container, notes) {
    const image = container.image.name;
    const current = container.image.tag.value;
    const target = container.result.tag;
    const system = [
        'You are a release-notes analyst for container image upgrades.',
        'You are given the release notes for the versions released after the user\'s',
        'current version, up to and including the target version. Every change in',
        'these notes is part of this upgrade - do not question or speculate about',
        'which version is current or target.',
        'Summarize what changed and flag potentially breaking changes such as renamed',
        'or removed config/env keys, changed volume or data layouts, API/CLI changes,',
        'dropped platforms, or required manual migration steps.',
        'riskLevel must be one of: none, low, medium, high.',
        'For each breaking change and highlight, set version to the exact version tag',
        'from the notes where it appears, when identifiable.',
        'Output only the structured fields. Do not include your reasoning,',
        'meta-commentary, or questions in any field. Be concise and specific, and use',
        'only the provided release notes; never invent changes.',
    ].join(' ');
    const { kept, dropped } = capNotes(notes);
    const notesText = kept
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
    return {
        system, user, schema: RESPONSE_SCHEMA, dropped, chars: user.length,
    };
}

module.exports = {
    buildPrompt,
    RESPONSE_SCHEMA,
};
