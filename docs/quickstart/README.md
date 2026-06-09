# Quick start

## Run the Docker image
The easiest way to start is to deploy the official _**Hosaka**_ image.

<!-- tabs:start -->
#### **Docker Compose**
```yaml
services:
  hosaka:
    image: ghcr.io/nopoz/hosaka:latest
    container_name: hosaka
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./store:/store
    ports:
      - 3000:3000
```
#### **Docker**
```bash
docker run -d --name hosaka \
  -v "/var/run/docker.sock:/var/run/docker.sock" \
  -v "$(pwd)/store:/store" \
  -p 3000:3000 \
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

?> Hosaka is available on GitHub Container Registry: `ghcr.io/nopoz/hosaka`

Then bring it up and open the UI:

```bash
docker compose up -d
```

## Open the UI
[Open the UI](http://localhost:3000) in a browser. With a default local watcher,
Hosaka watches every container on the host, so your running containers appear in
the list with their current version and any available update.

## Watch your first container
By default Hosaka watches all containers (`WATCHBYDEFAULT=true`). To watch only
the containers you choose, disable that on the watcher and opt containers in with
a label:

```yaml
labels:
  - hosaka.watch=true
```

See the [watcher documentation](configuration/watchers/) for per-container tag
filters, digest watching, custom display name and icon, and release-notes links.

## Run your first update
When an update is available, the container's row in the UI shows an **Update**
button. Clicking it runs whichever trigger you have configured in install mode
and streams the script's output to a live console, then confirms the new
container is healthy before marking the update done.

To wire up updates, configure a trigger with install mode enabled. The built-in
[Portainer update script](configuration/triggers/script/portainer.md) is a
ready-to-use option for Portainer-managed stacks; you can also auto-update Docker
containers and compose stacks directly. See the
[triggers documentation](configuration/triggers/) for the full list and how
install mode works.

## Going deeper...

?> Need to fine-tune how Hosaka watches your containers?
Take a look at the [**watcher documentation**](configuration/watchers/)!

?> Need to integrate other registries (ECR, GCR...)?
Take a look at the [**registry documentation**](configuration/registries/).

?> Want a worked configuration?
See the **[complete configuration example](configuration/?id=complete-example)**.
