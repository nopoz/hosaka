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
| `UPDATE_TIMEOUT`          | :white_circle: | Seconds to wait for the container to reach the target image.                           | `300`   |
| `POLL_INTERVAL`           | :white_circle: | Seconds between container-state polls.                                                 | `5`     |

> These `PORTAINER_API_*` variables are plain environment variables read by the
> script. Unlike `HOSAKA_*` variables, they do **not** support the `__FILE`
> Docker-secret convention. To keep the key out of your compose file, use the
> compose `secrets` mechanism and export it into the env in your own entrypoint,
> or supply it via your secret manager.

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

A full reference stack is provided at `docker-compose.portainer.example.yml` in
the project root.

## Using your own script instead

Set `HOSAKA_TRIGGER_SCRIPT_{trigger_name}_PATH` to your own script's path and
mount it in. See the [`script` trigger](configuration/triggers/script/) page for
the arguments Hosaka passes.

> **Mount caveat:** the bundled script lives at `/scripts/portainer_stack_update.sh`.
> Bind-mounting an entire volume at `/scripts` shadows it. To keep the bundled
> script available alongside your own, mount individual files
> (`/host/mine.sh:/scripts/mine.sh`) rather than the whole directory.
