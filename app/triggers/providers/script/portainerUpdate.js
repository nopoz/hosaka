const readline = require('readline');
const request = require('../../../request');

/**
 * Native Node port of scripts/portainer_stack_update.sh.
 *
 * Edits a container's Portainer stack file (image:current -> image:target) and
 * PUTs a stack update, then watches the container reach the target image via the
 * Portainer-proxied Docker event stream (with an inspect-poll backstop). All
 * HTTP goes through the shared axios adapter; JSON is handled natively, so the
 * jq/curl shape bugs the bash version suffered from (issue #97) cannot recur.
 *
 * Talks to Portainer through PORTAINER_API_ENDPOINT / PORTAINER_API_KEY (and the
 * opt-in PORTAINER_INSECURE for self-signed / IP endpoints), read from the
 * container environment exactly as the bash script did.
 */

const MOVING_TAGS = /:(latest|stable|edge|main|master|nightly|rolling|dev)(["'\s]|$)/;

function readEnv() {
    return {
        portainerUrl: process.env.PORTAINER_API_ENDPOINT,
        apiKey: process.env.PORTAINER_API_KEY,
        insecure: /^(true|1|yes)$/i.test(process.env.PORTAINER_INSECURE || ''),
    };
}

function nowSec() {
    return Math.floor(Date.now() / 1000);
}

function lastSegment(imageRef) {
    return String(imageRef).split('/').pop();
}

// A Portainer/Docker proxy list endpoint must return a JSON array. On failure it
// returns an object like { message: "..." }; surface the real reason instead of
// letting downstream array access produce a cryptic error (this is the #97 fix,
// now structural rather than a guard bolted onto a jq pipeline).
function requireArray(value, context) {
    if (!Array.isArray(value)) {
        const msg = value && (value.message || value.details);
        throw new Error(
            `unexpected response from Portainer while ${context}`
            + (msg ? `: ${msg}` : ` (response was not a JSON array)`),
        );
    }
    return value;
}

function api(env, opts) {
    return request({
        uri: `${env.portainerUrl}${opts.path}`,
        method: opts.method || 'GET',
        headers: { 'X-API-Key': env.apiKey, Accept: 'application/json', ...(opts.headers || {}) },
        insecure: env.insecure,
        body: opts.body,
        responseType: opts.responseType,
        signal: opts.signal,
        resolveWithFullResponse: opts.full,
    });
}

// Demux Docker's multiplexed log stream. Non-TTY containers prefix each frame
// with 8 bytes: [stream:1][000][payload-len:4 BE]. Replaces the od/awk monster.
function demuxDockerStream(buf) {
    if (!buf || !buf.length) return '';
    // A TTY/raw stream won't carry frame headers; the first byte is real text.
    if (buf[0] > 2) return buf.toString('utf8');
    let out = '';
    let i = 0;
    while (i + 8 <= buf.length) {
        const len = buf.readUInt32BE(i + 4);
        i += 8;
        out += buf.toString('utf8', i, Math.min(i + len, buf.length));
        i += len;
    }
    return out;
}

async function preflight(env) {
    const missing = [];
    if (!env.portainerUrl) missing.push('PORTAINER_API_ENDPOINT');
    if (!env.apiKey) missing.push('PORTAINER_API_KEY');
    if (missing.length) {
        throw new Error(
            `required environment variable(s) not set: ${missing.join(', ')}. `
            + 'PORTAINER_API_ENDPOINT must include the /api suffix '
            + '(e.g. https://portainer.example.com:9443/api); PORTAINER_API_KEY is a Portainer API token.',
        );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
        await api(env, { path: '/endpoints', signal: controller.signal });
    } catch (err) {
        const status = err.response && err.response.status;
        if (status === 401 || status === 403) {
            throw new Error(
                `Portainer rejected the API key (HTTP ${status}). `
                + 'Check PORTAINER_API_KEY - it must be a valid, non-expired token.',
            );
        }
        if (status === 404) {
            throw new Error(
                `Portainer returned HTTP 404 for "${env.portainerUrl}/endpoints". `
                + 'Check that PORTAINER_API_ENDPOINT includes the /api suffix (e.g. https://host:9443/api).',
            );
        }
        if (status) {
            throw new Error(`unexpected HTTP ${status} from "${env.portainerUrl}/endpoints".`);
        }
        if (err.code && /CERT|SELF_SIGNED|VERIFY/i.test(err.code)) {
            throw new Error(
                `TLS certificate verification failed for "${env.portainerUrl}". Portainer is reachable but `
                + 'presented a certificate that could not be verified (expected for a self-signed cert or an IP '
                + 'address). If you trust this endpoint, set PORTAINER_INSECURE=true to skip verification.',
            );
        }
        throw new Error(
            `could not reach Portainer at "${env.portainerUrl}" (${err.code || err.message}). `
            + 'Check PORTAINER_API_ENDPOINT (scheme, host, port) and network reachability.',
        );
    } finally {
        clearTimeout(timer);
    }
}

// Discover the environment that actually runs the container in this compose
// project. No "local watcher == environment 1" assumption (the #97 root cause):
// narrow by watcher name, fall back to a full scan, and match each candidate
// against its live Docker proxy. Returns { endpointId, container }.
async function discoverEndpoint(env, { containerName, composeProject, watcher }) {
    const named = await api(env, { path: `/endpoints?name=${encodeURIComponent(watcher)}` });
    requireArray(named, `listing Portainer environments named "${watcher}"`);

    let candidateIds = named.map((e) => e.Id);
    if (candidateIds.length === 0) {
        const all = await api(env, { path: '/endpoints' });
        requireArray(all, 'listing Portainer environments');
        candidateIds = all.map((e) => e.Id);
    }

    for (const id of candidateIds) {
        let containers;
        try {
            containers = await api(env, { path: `/endpoints/${id}/docker/containers/json?all=true` });
        } catch (err) {
            continue; // environment down/unreachable; try the next one
        }
        if (!Array.isArray(containers)) continue;
        const match = containers.find((c) => (c.Names || []).includes(`/${containerName}`)
            && (c.Labels || {})['com.docker.compose.project'] === composeProject);
        if (match) return { endpointId: id, container: match };
    }
    return { endpointId: null, container: null };
}

async function getStackId(env, endpointId, resourceId) {
    const filters = encodeURIComponent(JSON.stringify({ EndpointID: endpointId }));
    const stacks = await api(env, { path: `/stacks?filters=${filters}` });
    requireArray(stacks, `listing Portainer stacks on endpoint ${endpointId}`);
    const stack = stacks.find((s) => s.ResourceControl && String(s.ResourceControl.Id) === String(resourceId));
    return { stackId: stack ? stack.Id : null, env: stack ? stack.Env : undefined };
}

function rewriteStackFile({ stackFileContent, imageName, currentVersion, targetVersion }) {
    const from = `${imageName}:${currentVersion}`;
    const to = `${imageName}:${targetVersion}`;
    if (!stackFileContent.includes(from)) {
        const lines = stackFileContent.split('\n').filter((l) => l.includes(`${imageName}:`));
        let hint = '';
        if (/^sha256:/.test(currentVersion) || /^[0-9a-f]{12,}$/.test(currentVersion)) {
            hint = `\nHosaka is watching this container by image DIGEST (a moving tag such as "latest"). `
                + `It passed a digest ("${currentVersion}") instead of a version, and this updater cannot `
                + `rewrite a moving tag. Pin an explicit version in your stack (e.g. "${imageName}:1.2.3").`;
        } else if (lines.some((l) => MOVING_TAGS.test(l))) {
            hint = `\nYour stack pins a moving tag for this image. This updater only works with explicit version `
                + `tags. Replace the moving tag with a specific version (e.g. "${imageName}:1.2.3").`;
        }
        const lineList = lines.length
            ? `\nLines referencing "${imageName}":\n${lines.map((l) => `  ${l.trim()}`).join('\n')}`
            : `\nNo lines referencing "${imageName}" were found - check the image name matches your compose file.`;
        throw new Error(
            `could not find "${from}" in the stack file. The updater rewrites a pinned image tag, so the stack `
            + `must pin the exact current version.${hint}${lineList}`,
        );
    }
    const updated = stackFileContent.split(from).join(to);
    if (!updated.includes(to)) {
        throw new Error('stack file was not successfully updated with the target version.');
    }
    return updated;
}

async function inspectContainer(env, endpointId, containerName) {
    const list = await api(env, { path: `/endpoints/${endpointId}/docker/containers/json?all=true` });
    if (!Array.isArray(list)) return null;
    const found = list.find((c) => (c.Names || []).includes(`/${containerName}`));
    if (!found) return null;
    return api(env, { path: `/endpoints/${endpointId}/docker/containers/${found.Id}/json` });
}

// ready | unhealthy | sameimage | waiting | absent
async function checkContainerState(env, endpointId, containerName, expectedImage, initialImageId) {
    const info = await inspectContainer(env, endpointId, containerName);
    if (!info) return 'absent';
    const runningImageName = lastSegment(info.Config && info.Config.Image);
    const state = info.State && info.State.Status;
    const currentImageId = info.Image;
    const health = (info.State && info.State.Health && info.State.Health.Status) || 'none';
    if (runningImageName === expectedImage && state === 'running') {
        if (health === 'unhealthy') return 'unhealthy';
        if (health === 'starting') return 'waiting';
        if (initialImageId && currentImageId === initialImageId) return 'sameimage';
        return 'ready';
    }
    return 'waiting';
}

async function fetchContainerLogs(env, endpointId, containerName, lines, emit) {
    emit(`Fetching last ${lines} lines of logs for "${containerName}"...`);
    const list = await api(env, { path: `/endpoints/${endpointId}/docker/containers/json?all=true` });
    if (!Array.isArray(list)) return;
    const found = list.find((c) => (c.Names || []).includes(`/${containerName}`));
    if (!found) {
        emit(`  Could not find container ID for "${containerName}"`);
        return;
    }
    const raw = await api(env, {
        path: `/endpoints/${endpointId}/docker/containers/${found.Id}/logs?stdout=true&stderr=true&tail=${lines}`,
        responseType: 'arraybuffer',
    });
    const text = demuxDockerStream(Buffer.from(raw)).split('\n').slice(-lines).join('\n');
    if (text.trim()) {
        emit('Container logs:');
        emit('----------------------------------------');
        text.split('\n').forEach((l) => emit(l));
        emit('----------------------------------------');
    } else {
        emit('  No logs available or error fetching logs');
    }
}

// Wait for the container to reach the target image, driven by the live Docker
// event stream with a periodic inspect backstop (events can be missed) and an
// overall timeout. Resolves on success; throws on unhealthy/timeout.
function waitForContainerUpdate(env, { endpointId, containerName, expectedImage, timeoutSec, initialImageId, pollIntervalSec }, emit) {
    return new Promise((resolve, reject) => {
        const controller = new AbortController();
        let settled = false;
        const since = nowSec();
        const filters = encodeURIComponent(JSON.stringify({ container: [containerName] }));

        emit(`\nUpdate initiated - waiting for "${containerName}" to reach image "${expectedImage}" (timeout ${timeoutSec}s)`);
        emit('Streaming live Docker events (inspect backstop every 10s)...');

        const cleanup = () => {
            clearTimeout(overall);
            clearInterval(backstop);
            controller.abort();
        };
        const done = (rc) => { if (settled) return; settled = true; cleanup(); resolve(rc); };
        const fail = (err) => { if (settled) return; settled = true; cleanup(); reject(err); };

        const verify = async () => {
            if (settled) return;
            let st;
            try {
                st = await checkContainerState(env, endpointId, containerName, expectedImage, initialImageId);
            } catch (err) {
                return; // transient inspect error; backstop will retry
            }
            if (st === 'ready') {
                emit(`  Container running target image and healthy: ${expectedImage}`);
                done('ready');
            } else if (st === 'sameimage') {
                emit('  WARNING: running target tag but image ID unchanged - may have already been at target');
                done('sameimage');
            } else if (st === 'unhealthy') {
                fail(new Error('container running but health check is unhealthy'));
            }
        };

        const overall = setTimeout(
            () => fail(new Error(`Timeout waiting for container update after ${timeoutSec}s`)),
            timeoutSec * 1000,
        );
        const backstop = setInterval(() => { verify(); }, 10000);

        api(env, {
            path: `/endpoints/${endpointId}/docker/events?since=${since}&filters=${filters}`,
            responseType: 'stream',
            signal: controller.signal,
            full: true,
        }).then(({ body: stream }) => {
            const rl = readline.createInterface({ input: stream });
            rl.on('line', (line) => {
                let ev;
                try { ev = JSON.parse(line); } catch (err) { return; }
                const action = ev.Action || ev.status || '';
                const img = (ev.Actor && ev.Actor.Attributes && ev.Actor.Attributes.image) || '';
                if (!action || /^exec_/.test(action)) return;
                if (/^(start|create|stop|kill|destroy|restart|die|oom|rename|health_status)/.test(action)) {
                    emit(`  - ${action}${img ? ` (${img})` : ''}`);
                }
                if (action === 'start' || /^health_status/.test(action)) {
                    verify();
                }
            });
            stream.on('error', () => { /* aborted on settle, or stream dropped; backstop covers it */ });
        }).catch(() => {
            // Event stream could not be opened; fall back to the inspect backstop.
            if (!settled) emit('  (event stream unavailable - falling back to inspect polling)');
        });

        // Kick an immediate inspect so an already-complete update resolves fast.
        verify();
    });
}

async function waitOldContainerGone(env, { endpointId, oldImage, timeoutSec, pollIntervalSec }, emit) {
    emit(`\nensuring the old container is no longer present...`);
    const start = nowSec();
    let waited = false;
    while (nowSec() - start < timeoutSec) {
        const list = await api(env, { path: `/endpoints/${endpointId}/docker/containers/json?all=true` });
        const count = Array.isArray(list)
            ? list.filter((c) => String(c.Image).endsWith(oldImage)).length
            : 0;
        if (count === 0) {
            if (waited) emit(`old container removed after ${nowSec() - start}s`);
            emit(`no containers are running with the old image version: ${oldImage}`);
            return;
        }
        waited = true;
        emit(`old container with image "${oldImage}" still present, waiting for cleanup... (elapsed: ${nowSec() - start}s)`);
        await new Promise((r) => setTimeout(r, pollIntervalSec * 1000));
    }
    emit(`WARNING: old container "${oldImage}" still present after ${timeoutSec}s`);
}

/**
 * Run the full Portainer stack update for one container.
 * @param {object} params { containerName, imageName, currentVersion, targetVersion, watcher, composeProject, timeout, pollInterval }
 * @param {function} emitLine emit one progress line to the UI / console
 */
async function runPortainerUpdate(params, emitLine) {
    const emit = typeof emitLine === 'function' ? emitLine : () => {};
    const env = readEnv();
    const {
        containerName, imageName, currentVersion, targetVersion, watcher, composeProject,
    } = params;
    const timeoutSec = Math.round((params.timeout || 300000) / 1000);
    const pollIntervalSec = params.pollInterval || 5;

    if (!containerName || !imageName || !currentVersion || !targetVersion || !composeProject) {
        throw new Error(
            'missing required argument(s). An empty value usually means the container is missing version or '
            + 'compose-project metadata Hosaka could not resolve.',
        );
    }

    await preflight(env);

    emit(`\ncontainer name: ${containerName}`);
    emit(`image name: ${imageName}`);
    emit(`current version: ${currentVersion}`);
    emit(`desired upgrade version: ${targetVersion}`);
    emit(`compose project name: ${composeProject}`);

    emit(`\nretrieving portainer info for container "${containerName}" in stack "${composeProject}"...`);
    const { endpointId, container } = await discoverEndpoint(env, { containerName, composeProject, watcher });
    if (!endpointId) {
        throw new Error(
            `could not determine the Portainer endpoint for watcher "${watcher}". No environment matching `
            + `"${watcher}" has a container "${containerName}" in project "${composeProject}". Check that the `
            + 'Hosaka watcher name matches the Portainer environment, and that the container is Portainer-managed.',
        );
    }
    emit(`container endpoint id: ${endpointId}`);

    const resourceId = container.Portainer && container.Portainer.ResourceControl && container.Portainer.ResourceControl.Id;
    if (resourceId === undefined || resourceId === null) {
        throw new Error(
            `could not find Portainer stack ownership for "${containerName}" on endpoint ${endpointId}. This `
            + 'updater only works on containers deployed as part of a Portainer stack. If it is a standalone '
            + 'container or was created outside Portainer, it cannot be updated this way.',
        );
    }
    emit(`container resource id: ${resourceId}`);

    const { stackId, env: stackEnv } = await getStackId(env, endpointId, resourceId);
    if (!stackId) {
        throw new Error(
            `no Portainer stack found for "${containerName}" on endpoint ${endpointId} (resource id ${resourceId}). `
            + `Confirm "${composeProject}" is a Portainer-managed stack on this environment.`,
        );
    }
    emit(`container stack id: ${stackId}`);

    const stackFile = await api(env, { path: `/stacks/${stackId}/file` });
    const stackFileContent = stackFile && stackFile.StackFileContent;
    if (!stackFileContent) {
        throw new Error(`${composeProject} stack file contents were not retrieved successfully.`);
    }
    emit(`${composeProject} stack file contents retrieved successfully from portainer API`);

    emit(`\nupdating ${composeProject} stack file data with upgrade version: ${targetVersion}`);
    const updatedStackFile = rewriteStackFile({ stackFileContent, imageName, currentVersion, targetVersion });
    emit(`successfully updated ${composeProject} stack data with ${targetVersion}`);

    emit('\ncapturing initial container state...');
    let initialImageId = '';
    const initial = await inspectContainer(env, endpointId, containerName);
    if (initial) {
        initialImageId = initial.Image;
        emit(`initial container image: ${lastSegment(initial.Config && initial.Config.Image)}`);
        emit(`initial container state: ${initial.State && initial.State.Status}`);
        emit(`initial image ID: ${String(initialImageId).slice(0, 19)}...`);
    } else {
        emit(`WARNING: could not find container "${containerName}" before update`);
    }

    emit(`\npushing ${composeProject} stack file update to portainer...`);
    let putResponse;
    try {
        putResponse = await api(env, {
            path: `/stacks/${stackId}?endpointId=${endpointId}`,
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: { env: stackEnv || [], prune: true, pullImage: false, stackFileContent: updatedStackFile },
            full: true,
        });
    } catch (err) {
        const status = err.response && err.response.status;
        const detail = err.response && err.response.data;
        throw new Error(
            `failed to push update to portainer (HTTP ${status || 'n/a'})`
            + (detail ? `: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''),
        );
    }
    emit(`\nstack update successfully pushed to portainer (http ${putResponse.statusCode})`);
    emit('note: portainer is now processing the update asynchronously...');

    const expectedImage = `${imageName}:${targetVersion}`;
    try {
        await waitForContainerUpdate(env, {
            endpointId, containerName, expectedImage, timeoutSec, initialImageId, pollIntervalSec,
        }, emit);
    } catch (err) {
        emit(`\nERROR: ${err.message}`);
        await fetchContainerLogs(env, endpointId, containerName, 30, emit).catch(() => {});
        throw err;
    }

    await waitOldContainerGone(env, {
        endpointId, oldImage: `${imageName}:${currentVersion}`, timeoutSec, pollIntervalSec,
    }, emit);

    emit('\nupdate verification completed successfully.');
}

module.exports = runPortainerUpdate;
module.exports.internals = {
    requireArray, demuxDockerStream, rewriteStackFile, discoverEndpoint, checkContainerState, readEnv,
};
