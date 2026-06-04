# Hosaka

Hosaka watches your Docker hosts for new container image versions, then lets you
react: get notified, or update the container with a single click and watch the
update run live.

Hosaka is a fork of [What's Up Docker (WUD)](https://github.com/getwud/wud),
rebuilt around a faster, mobile-friendly UI and one-click updates.

## What's different from WUD

| Area | WUD | Hosaka |
|------|-----|--------|
| **Updating from the UI** | run a trigger from the container's Triggers tab | one-click **Update** on the container row |
| **Update progress** | none | live console output of the update script, streamed line by line |
| **Mobile** | desktop-oriented: permanent nav, no mobile layout | fully responsive: hamburger nav, mobile layouts, update from your phone |
| **Live container state** | manual refresh | list updates in place over SSE, no full-page reload |
| **In-app UX** | filter + oldest-first toggle | sort by name, update type, or watcher; distinct color per update type, including prerelease |

## How it works

Hosaka is built on three concepts:

- **Watchers** query your Docker hosts to get the containers to watch
- **Registries** query the Docker registries to find available updates
- **Triggers** perform actions when updates are available

## Features

**Smart update detection**
- Watch multiple Docker hosts at once, local socket or remote over TCP/TLS
- Semver-aware: every update is classified as major, minor, patch, or prerelease
- Digest watching catches new images behind mutable tags like `latest`
- Per-tag include/exclude regex and tag transforms to handle any versioning scheme
- Scheduled (cron) scans plus instant detection from Docker events

**Per-container control, no central config**
- Drive everything with `hosaka.*` Docker labels: opt in/out, set tag filters,
  custom display name and icon, or a link to the release notes
- Update thresholds so you only act on, say, minor and patch bumps

**Notify or update, your call**
- Notify through SMTP, Slack, Discord, Telegram, Apprise, IFTTT, Pushover,
  Kafka, MQTT, or HTTP webhooks, with templated titles and bodies
- Auto-update Docker containers and docker-compose stacks, or run your own
  update script, automatically or with a single click from the UI
- Per-update or batched notifications, with a "once" guard against repeats

**Built to run in your stack**
- Web UI and a full REST API
- Prometheus metrics and a `/health` endpoint, ready for Grafana
- Basic auth or OpenID Connect (OIDC) for SSO
- Docker secrets via `__FILE` env vars, single image, sensible defaults

## Get started

Create a `docker-compose.yml`:

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

Then bring it up and open the UI:

```bash
docker compose up -d
```

The UI is now at [http://localhost:3000](http://localhost:3000).

For a hardened setup (read-only Docker socket proxy, plus watcher, registry, and
trigger config), copy [`docker-compose.example.yml`](docker-compose.example.yml)
and adjust it. Full configuration reference lives in [`docs/`](docs/).

## Triggers
- Send notifications using [**SMTP**](https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol), [**Apprise**](https://github.com/caronc/apprise-api), [**IFTTT**](https://ifttt.com), [**Pushover**](https://pushover.net), [**Slack**](https://slack.com), [**Telegram**](https://telegram.org/), and [**Discord**](https://discord.com/)
- Update your [**docker**](https://www.docker.com) containers or your [**docker-compose**](https://docs.docker.com/compose) stack, automatically or with a single click in the UI
- Run your own update script and watch its output live
- Integrate with third-party systems using [**Kafka**](https://kafka.apache.org), [**MQTT**](https://mqtt.org), and **HTTP webhooks**
- Set up your own update strategies (e.g. auto-update on minor and patch versions, notify by email on major versions)

## Registries

- [**AWS Elastic Container Registry**](https://aws.amazon.com/ecr)
- [**Azure Container Registry**](https://azure.microsoft.com/services/container-registry)
- [**Docker Hub**](http://hub.docker.com)
- [**Forgejo Container Registry**](https://forgejo.org/)
- [**Gitea Container Registry**](https://gitea.com/)
- [**GitHub Container Registry**](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-docker-registry)
- [**GitLab Container Registry**](https://docs.gitlab.com/ee/user/packages/container_registry/)
- [**Google Container Registry**](https://cloud.google.com/container-registry)
- [**LinuxServer Container Registry (lscr.io)**](https://fleet.linuxserver.io/)
- [**Red Hat Quay**](https://quay.io/)
- [**Self-hosted Docker Registry**](https://docs.docker.com/registry/)

## Authentication
- [Openid Connect](https://openid.net/connect/)
- [Basic authentication](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication)

## Integrations

- [**Authelia**](https://www.authelia.com/)
- [**Authentik**](https://goauthentik.io/)
- [**Auth0**](https://auth0.com/)
- [**Grafana**](https://grafana.com/)
- [**Home-Assistant**](https://www.home-assistant.io/)
- [**Keycloak**](https://www.keycloak.org/)
- [**Prometheus**](https://prometheus.io/)

## Contact & Support
- Create a [GitHub issue](https://github.com/nopoz/hosaka/issues) for bug reports, feature requests, or questions
- Add a star on [GitHub](https://github.com/nopoz/hosaka) to support the project!

## Credits
Hosaka builds on [What's Up Docker](https://github.com/getwud/wud) by the WUD
authors and contributors. Thanks for the foundation.

## License
This project is licensed under the [MIT license](https://github.com/nopoz/hosaka/blob/main/LICENSE).
