# Portainer update script

Hosaka bundles a ready-to-use update script that performs in-place container
updates through the Portainer API. It is shipped inside the image at
`/scripts/portainer_stack_update.sh` and is the **default** script for the
[`script` trigger](configuration/triggers/script/) - if you do not set a `PATH`,
this is the script that runs.

## How it works

When you click **Update** on a container in the UI (the `script` trigger must
have `INSTALL=true`), the script:

1. Locates the container's Portainer stack on the matching endpoint (using the
   watcher name and compose project passed in by Hosaka).
2. Reads the stack's compose file and rewrites the image reference from
   `image:current` to `image:target`.
3. PUTs the updated stack back to Portainer, triggering a redeploy.
4. Watches a live Docker event stream (with an inspect-based backstop) until the
   container is recreated on the target image and healthy.
5. Confirms the old container is gone, then reports success.

The full live log is streamed to the UI's script-output console.

## Designed for pinned versions

This script is built for stacks that pin explicit image tags (for example
`nginx:1.27.1`) rather than moving tags like `latest`. That keeps you in control
of updates: Hosaka detects a newer tag, and the update rewrites your stack file
from the current pinned version to the new one. The stack definition always
records exactly what is deployed, so there are no surprise updates and you can
roll back at any time by redeploying the previous tag.

Because the update edits the stack file in place, that file **must contain the
current `image:tag`** of the container being updated. If the stack pins a
different tag, or uses a moving tag like `latest`, the script stops with an error
rather than guessing - so pin the versions in your stack before using it.

## Configuration

Two sets of variables are involved. The `HOSAKA_TRIGGER_SCRIPT_*` variables
configure the generic trigger; the `PORTAINER_API_*` variables (and the optional
timing ones) are read by the script itself.

### Trigger variables

| Env var                                          |    Required    | Description                                                              | Default                                |
|--------------------------------------------------|:--------------:|--------------------------------------------------------------------------|----------------------------------------|
| `HOSAKA_TRIGGER_SCRIPT_{trigger_name}_INSTALL`   |  :red_circle:  | Set `true` to make this the manual "Update" button trigger in the UI\*   | `false`                                |
| `HOSAKA_TRIGGER_SCRIPT_{trigger_name}_PATH`      | :white_circle: | Override the script. Omit to use the bundled Portainer script.           | `/scripts/portainer_stack_update.sh`   |
| `HOSAKA_TRIGGER_SCRIPT_{trigger_name}_TIMEOUT`   | :white_circle: | Milliseconds before the trigger considers the script timed out.          | `300000` (5 minutes)                   |

\* Only one `INSTALL` trigger may exist across all triggers; setting more than
one makes the UI throw an error.

### Script variables (read by the bundled script)

| Env var                   |    Required    | Description                                                                            | Default |
|---------------------------|:--------------:|---------------------------------------------------------------------------------------|---------|
| `PORTAINER_API_ENDPOINT`  |  :red_circle:  | Portainer API base URL, including the `/api` suffix (e.g. `https://host:9443/api`).    |         |
| `PORTAINER_API_KEY`       |  :red_circle:  | A Portainer API access token. Prefer a Docker secret over an inline value.             |         |
| `PORTAINER_INSECURE`      | :white_circle: | Set `true` to skip TLS certificate verification (self-signed cert / connect by IP).    | `false` |
| `UPDATE_TIMEOUT`          | :white_circle: | Seconds to wait for the container to reach the target image.                           | `300`   |
| `POLL_INTERVAL`           | :white_circle: | Seconds between container-state polls.                                                 | `5`     |

> These `PORTAINER_API_*` variables are plain environment variables read by the
> script. Unlike `HOSAKA_*` variables, they do **not** support the `__FILE`
> Docker-secret convention. To keep the key out of your compose file, use the
> compose `secrets` mechanism and export it into the env in your own entrypoint,
> or supply it via your secret manager.

> **HTTPS with a self-signed certificate.** By default the script verifies the
> Portainer endpoint's TLS certificate, so an `https://` endpoint with a
> self-signed certificate (or one reached by IP, where the certificate's name
> won't match) fails the connectivity preflight with a certificate error. If you
> trust the endpoint, set `PORTAINER_INSECURE=true` to skip verification.
> Accepted values are `true`, `1`, or `yes`.

## Example

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  hosaka:
    image: ghcr.io/nopoz/hosaka:latest
    environment:
      - HOSAKA_TRIGGER_SCRIPT_PORTAINER_INSTALL=true
      - PORTAINER_API_ENDPOINT=https://portainer.example.com:9443/api
      - PORTAINER_API_KEY=ptr_xxxxxxxxxxxxxxxx
      # PATH is optional; defaults to the bundled script:
      # - HOSAKA_TRIGGER_SCRIPT_PORTAINER_PATH=/scripts/portainer_stack_update.sh
```
#### **Docker**
```bash
docker run \
-e HOSAKA_TRIGGER_SCRIPT_PORTAINER_INSTALL=true \
-e PORTAINER_API_ENDPOINT=https://portainer.example.com:9443/api \
-e PORTAINER_API_KEY=ptr_xxxxxxxxxxxxxxxx \
ghcr.io/nopoz/hosaka:latest
```
<!-- tabs:end -->

A full reference stack is provided at `docker-compose.example.yml` in the project
root (the Portainer script trigger is one of the documented sections there).

## Using your own script instead

Set `HOSAKA_TRIGGER_SCRIPT_{trigger_name}_PATH` to your own script's path and
mount it in. See the [`script` trigger](configuration/triggers/script/) page for
the arguments Hosaka passes.

> **Mount caveat:** the bundled script lives at `/scripts/portainer_stack_update.sh`.
> Bind-mounting an entire volume at `/scripts` shadows it. To keep the bundled
> script available alongside your own, mount individual files
> (`/host/mine.sh:/scripts/mine.sh`) rather than the whole directory.
