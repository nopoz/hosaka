# Docker Watchers
![logo](docker.png)

Watchers are responsible for scanning Docker containers.

The ```docker``` watcher lets you configure the Docker hosts you want to watch.

## Variables

| Env var                                                   | Required       | Description                                                     | Supported values                               | Default value when missing                                      |
| --------------------------------------------------------- |:--------------:| --------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- | 
| `HOSAKA_WATCHER_{watcher_name}_SOCKET`                       | :white_circle: | Docker socket to watch                                          | Valid unix socket                              | `/var/run/docker.sock`                                          |
| `HOSAKA_WATCHER_{watcher_name}_HOST`                         | :white_circle: | Docker hostname or ip of the host to watch                      |                                                |                                                                 |
| `HOSAKA_WATCHER_{watcher_name}_PORT`                         | :white_circle: | Docker port of the host to watch                                |                                                | `2375`                                                          |
| `HOSAKA_WATCHER_{watcher_name}_CAFILE`                       | :white_circle: | CA pem file path (only for TLS connection)                      |                                                |                                                                 |
| `HOSAKA_WATCHER_{watcher_name}_CERTFILE`                     | :white_circle: | Certificate pem file path (only for TLS connection)             |                                                |                                                                 |
| `HOSAKA_WATCHER_{watcher_name}_KEYFILE`                      | :white_circle: | Key pem file path (only for TLS connection)                     |                                                |                                                                 |
| `HOSAKA_WATCHER_{watcher_name}_CRON`                         | :white_circle: | Scheduling options                                              | [Valid CRON expression](https://crontab.guru/) | `0 * * * *` (every hour)                                        |
| `HOSAKA_WATCHER_{watcher_name}_WATCHBYDEFAULT`               | :white_circle: | If Hosaka must monitor all containers by default                   | `true`, `false`                                | `true`                                                          |
| `HOSAKA_WATCHER_{watcher_name}_WATCHALL`                     | :white_circle: | If Hosaka must monitor all containers instead of just running ones | `true`, `false`                                | `false`                                                         |
| `HOSAKA_WATCHER_{watcher_name}_WATCHEVENTS`                  | :white_circle: | If Hosaka must monitor docker events                               | `true`, `false`                                | `true`                                                          |
| `HOSAKA_WATCHER_{watcher_name}_WATCHATSTART`                 | :white_circle: | If Hosaka must check for image updates during startup              | `true`, `false`                                | `true`                                                          |
| ~~`HOSAKA_WATCHER_{watcher_name}_WATCHDIGEST`~~ (deprecated) | :white_circle: | If Hosaka must monitor container digests                           |                                                | `false` for semver image tags, `true` for non semver image tags |

?> If no watcher is configured, a default one named `local` will be automatically created (reading the Docker socket).

?> Multiple watchers can be configured (if you have multiple Docker hosts to watch).  
You just need to give them different names.

!> Socket configuration and host/port configuration are mutually exclusive.

!> If socket configuration is used, don't forget to mount the Docker socket on your Hosaka container.

!> If host/port configuration is used, don't forget to enable the Docker remote API. \
[See dockerd documentation](https://docs.docker.com/engine/reference/commandline/dockerd/#description)

!> If the Docker remote API is secured with TLS, don't forget to mount and configure the TLS certificates. \
[See dockerd documentation](https://docs.docker.com/engine/security/protect-access/#use-tls-https-to-protect-the-docker-daemon-socket)

!> Watching image digests causes an extensive usage of _Docker Registry Pull API_ which is restricted by [**Quotas on the Docker Hub**](https://docs.docker.com/docker-hub/download-rate-limit/). \
By default, Hosaka enables it only for **non semver** image tags. \
You can tune this behavior per container using the `hosaka.watch.digest` label. \
If you face [quota related errors](https://docs.docker.com/docker-hub/download-rate-limit/#how-do-i-know-my-pull-requests-are-being-limited), consider slowing down the watcher rate by adjusting the `HOSAKA_WATCHER_{watcher_name}_CRON` variable.

## Variable examples

### Watch the local docker host every day at 1am

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
        - HOSAKA_WATCHER_LOCAL_CRON=0 1 * * *
```

#### **Docker**
```bash
docker run \
    -e HOSAKA_WATCHER_LOCAL_CRON="0 1 * * *" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

### Watch all containers regardless of their status (created, paused, exited, restarting, running...)

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
        - HOSAKA_WATCHER_LOCAL_WATCHALL=true
```

#### **Docker**
```bash
docker run \
    -e HOSAKA_WATCHER_LOCAL_WATCHALL="true" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

### Watch a remote docker host via TCP on 2375

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
        - HOSAKA_WATCHER_MYREMOTEHOST_HOST=myremotehost 
```

#### **Docker**
```bash
docker run \
    -e HOSAKA_WATCHER_MYREMOTEHOST_HOST="myremotehost" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

### Watch a remote docker host via TCP with TLS enabled on 2376

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
        - HOSAKA_WATCHER_MYREMOTEHOST_HOST=myremotehost
        - HOSAKA_WATCHER_MYREMOTEHOST_PORT=2376
        - HOSAKA_WATCHER_MYREMOTEHOST_CAFILE=/certs/ca.pem
        - HOSAKA_WATCHER_MYREMOTEHOST_CERTFILE=/certs/cert.pem
        - HOSAKA_WATCHER_MYREMOTEHOST_KEYFILE=/certs/key.pem
    volumes:
        - /my-host/my-certs/ca.pem:/certs/ca.pem:ro
        - /my-host/my-certs/ca.pem:/certs/cert.pem:ro
        - /my-host/my-certs/ca.pem:/certs/key.pem:ro
```

#### **Docker**
```bash
docker run \
    -e HOSAKA_WATCHER_MYREMOTEHOST_HOST="myremotehost" \
    -e HOSAKA_WATCHER_MYREMOTEHOST_PORT="2376" \
    -e HOSAKA_WATCHER_MYREMOTEHOST_CAFILE="/certs/ca.pem" \
    -e HOSAKA_WATCHER_MYREMOTEHOST_CERTFILE="/certs/cert.pem" \
    -e HOSAKA_WATCHER_MYREMOTEHOST_KEYFILE="/certs/key.pem" \
    -v /my-host/my-certs/ca.pem:/certs/ca.pem:ro \
    -v /my-host/my-certs/ca.pem:/certs/cert.pem:ro \
    -v /my-host/my-certs/ca.pem:/certs/key.pem:ro \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

!> Don't forget to mount the certificates into the container!

### Watch 1 local Docker host and 2 remote docker hosts at the same time

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
        -  HOSAKA_WATCHER_LOCAL_SOCKET=/var/run/docker.sock
        -  HOSAKA_WATCHER_MYREMOTEHOST1_HOST=myremotehost1
        -  HOSAKA_WATCHER_MYREMOTEHOST2_HOST=myremotehost2
```

#### **Docker**
```bash
docker run \
    -e  HOSAKA_WATCHER_LOCAL_SOCKET="/var/run/docker.sock" \
    -e  HOSAKA_WATCHER_MYREMOTEHOST1_HOST="myremotehost1" \
    -e  HOSAKA_WATCHER_MYREMOTEHOST2_HOST="myremotehost2" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

## Labels

To fine-tune the behaviour of Hosaka _per container_, you can add labels on them.

| Label                    |    Required    | Description                                        | Supported values                                                                                                                                                            | Default value when missing                                                            |
|--------------------------|:--------------:|----------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|
| `hosaka.watch`           | :white_circle: | Watch this container                               | Valid Boolean                                                                                                                                                               | `true` when `HOSAKA_WATCHER_{watcher_name}_WATCHBYDEFAULT` is `true` (`false` otherwise) |
| `hosaka.watch.digest`    | :white_circle: | Watch this container digest                        | Valid Boolean                                                                                                                                                               | `false` for semver image tags, `true` for non-semver image tags                       |
| `hosaka.tag.include`     | :white_circle: | Regex to include specific tags only                | Valid JavaScript Regex                                                                                                                                                      |                                                                                       |
| `hosaka.tag.exclude`     | :white_circle: | Regex to exclude specific tags                     | Valid JavaScript Regex                                                                                                                                                      |                                                                                       |
| `hosaka.tag.transform`   | :white_circle: | Transform function to apply to the tag             | `$valid_regex => $valid_string_with_placeholders` (see below)                                                                                                               |                                                                                       |
| `hosaka.link.template`   | :white_circle: | Browsable link associated to the container version | String template with placeholders `${raw}` `${major}` `${minor}` `${patch}` `${prerelease}`                                                                                 |                                                                                       |
| `hosaka.display.name`    | :white_circle: | Custom display name for the container              | Valid String                                                                                                                                                                | Container name                                                                        |
| `hosaka.display.icon`    | :white_circle: | Custom display icon for the container              | Valid [Material Design Icon](https://materialdesignicons.com/), [Fontawesome Icon](https://fontawesome.com/) or [Simple icon](https://simpleicons.org/) (see details below) | `mdi:docker`                                                                          |
| `hosaka.trigger.include` | :white_circle: | Triggers that may fire for this container          | Comma-separated trigger ids, each optionally suffixed with `:threshold` (see [Per-container trigger routing](#per-container-trigger-routing) below)                         | All configured triggers fire                                                          |
| `hosaka.trigger.exclude` | :white_circle: | Triggers that must not fire for this container     | Comma-separated trigger ids, each optionally suffixed with `:threshold` (see [Per-container trigger routing](#per-container-trigger-routing) below)                         | No triggers excluded                                                                  |

## Label examples

### Include specific containers to watch
Configure Hosaka to disable WATCHBYDEFAULT feature.
<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_WATCHER_LOCAL_WATCHBYDEFAULT=false
```

#### **Docker**
```bash
docker run \
    -e HOSAKA_WATCHER_LOCAL_WATCHBYDEFAULT="false" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

Then add the `hosaka.watch=true` label on the containers you want to watch.
<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  mariadb:
    image: mariadb:10.4.5
    ...
    labels:
      - hosaka.watch=true
```

#### **Docker**
```bash
docker run -d --name mariadb --label hosaka.watch=true mariadb:10.4.5
```
<!-- tabs:end -->

### Exclude specific containers to watch
Ensure `HOSAKA_WATCHER_{watcher_name}_WATCHBYDEFAULT` is true (default value).

Then add the `hosaka.watch=false` label on the containers you want to exclude from being watched.
<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  mariadb:
    image: mariadb:10.4.5
    ...
    labels:
      - hosaka.watch=false
```

#### **Docker**
```bash
docker run -d --name mariadb --label hosaka.watch=false mariadb:10.4.5
```
<!-- tabs:end -->

### Include only 3 digits semver tags
You can filter (by inclusion or inclusion) which versions can be candidates for update.

For example, you can indicate that you want to watch x.y.z versions only
<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:

  mariadb:
    image: mariadb:10.4.5
    labels:
      - hosaka.tag.include=^\d+\.\d+\.\d+$$
```

#### **Docker**
```bash
docker run -d --name mariadb --label 'hosaka.tag.include=^\d+\.\d+\.\d+$' mariadb:10.4.5
```
<!-- tabs:end -->

### Transform the tags before performing the analysis
In certain cases, tag values are so badly formatted that the resolution algorithm cannot find any valid update candidates or, worst, find bad positive matches.

For example, you can encounter such an issue if you need to deal with tags looking like `1.0.0-99-7b368146`, `1.0.0-273-21d7efa6`...  
By default, Hosaka will report bad positive matches because of the `sha-1` part at the end of the tag value (`-7b368146`...).  
That's a shame because `1.0.0-99` and `1.0.0-273` would have been valid semver values (`$major.$minor.$patch-$prerelease`).

You can get around this issue by providing a function that keeps only the part you are interested in.  

How does it work?  
The transform function must follow the following syntax:
```
$valid_regex_with_capturing_groups => $valid_string_with_placeholders
```

For example:
```bash
^(\d+\.\d+\.\d+-\d+)-.*$ => $1
```

The capturing groups are accessible with the syntax `$1`, `$2`, `$3`.... 

!> The first capturing group is accessible as `$1`! 

For example, you can indicate that you want to watch x.y.z versions only
<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:

  searx:
    image: searx/searx:1.0.0-269-7b368146
    labels:
      - hosaka.tag.include=^\d+\.\d+\.\d+-\d+-.*$$
      - hosaka.tag.transform=^(\d+\.\d+\.\d+-\d+)-.*$$ => $$1
```

#### **Docker**
```bash
docker run -d --name searx \
--label 'hosaka.tag.include=^\d+\.\d+\.\d+-\d+-.*$' \
--label 'hosaka.tag.transform=^(\d+\.\d+\.\d+-\d+)-.*$ => $1' \
searx/searx:1.0.0-269-7b368146
```
<!-- tabs:end -->

### Enable digest watching
Additionally to semver tag tracking, you can also track if the digest associated to the local tag has been updated.  
It can be convenient to monitor image tags known to be overridden (`latest`, `10`, `10.6`...)

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:

  mariadb:
    image: mariadb:10
    labels:
      - hosaka.tag.include=^\d+$$
      - hosaka.watch.digest=true
```
#### **Docker**
```bash
docker run -d --name mariadb --label 'hosaka.tag.include=^\d+$' --label hosaka.watch.digest=true mariadb:10
```
<!-- tabs:end -->

### Associate a link to the container version
You can associate a browsable link to the container version using a templated string.
For example, if you want to associate a mariadb version to a changelog (e.g. https://mariadb.com/kb/en/mariadb-1064-changelog),

you would specify a template like `https://mariadb.com/kb/en/mariadb-${major}${minor}${patch}-changelog`

The available placeholders are:
- `${raw}` the full unparsed version
- `${major}` the major version (if valid semver)
- `${minor}` the minor version (if valid semver)
- `${patch}` the patch version (if valid semver)
- `${prerelease}` the prerelease version (if valid semver)

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:

  mariadb:
    image: mariadb:10.6.4
    labels:
      - hosaka.link.template=https://mariadb.com/kb/en/mariadb-$${major}$${minor}$${patch}-changelog
```

#### **Docker**
```bash
docker run -d --name mariadb --label 'hosaka.link.template=https://mariadb.com/kb/en/mariadb-${major}${minor}${patch}-changelog' mariadb:10
```
<!-- tabs:end -->

### Customize the name and the icon to display
You can customize the name & the icon of a container (displayed in the UI, in Home-Assistant...)

Icons must be prefixed with:
- `mdi:` or `mdi-` for [Material Design icons](https://materialdesignicons.com/) (`mdi:database`, `mdi-server`...)
- `fab:` or `fab-` for [Fontawesome brand icons](https://fontawesome.com/) (`fab:github`, `fab-mailchimp`...)
- `far:` or `far-` for [Fontawesome regular icons](https://fontawesome.com/) (`far:heart`, `far-house`...)
- `fas:` or `fas-` for [Fontawesome solid icons](https://fontawesome.com/) (`fas:heart`, `fas-house`...)
- `si:` or `si-` for [Simple icons](https://simpleicons.org/) (`si:mysql`, `si-plex`...)
- `sh:` or `sh-` for [Selfh.st](https://selfh.st/icons/) (`sh:authentik`, `sh-authelia-light`...) (only works for logo available as `png`)

?> If you want to display Fontawesome icons or Simple icons in Home-Assistant, you need to install first the [HASS-fontawesome](https://github.com/thomasloven/hass-fontawesome) and the [HASS-simpleicons](https://github.com/vigonotion/hass-simpleicons) components.

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:

  mariadb:
    image: mariadb:10.6.4
    labels:
      - hosaka.display.name=Maria DB
      - hosaka.display.icon=si:mariadb
```

#### **Docker**
```bash
docker run -d --name mariadb --label 'hosaka.display.name=Maria DB' --label 'hosaka.display.icon=mdi-database' mariadb:10
```
<!-- tabs:end -->

## Per-container trigger routing

By default every configured trigger fires for every container that has an update.
The `hosaka.trigger.include` and `hosaka.trigger.exclude` labels let you override
that on a per-container basis.

**Label values** are comma-separated trigger ids (the name you gave the trigger in
its env var, lowercased). Each entry may optionally carry a per-entry threshold
suffix of the form `id:threshold`.

**Threshold vocabulary**

| Value        | Fires when the semver diff is...          |
|--------------|-------------------------------------------|
| `all`        | Any change (default when omitted)         |
| `major`      | Any change (same as `all`)                |
| `minor`      | minor, patch, or prerelease (not major)   |
| `patch`      | patch or prerelease (not major or minor)  |
| `major-only` | major only (exact)                        |
| `minor-only` | minor only (exact)                        |

?> `minor` and `patch` are cumulative: each also fires on anything less severe (a `minor` threshold fires on minor, patch, and prerelease updates). `major` currently behaves the same as `all`. `major-only` and `minor-only` are exact matches.

**Precedence:** `hosaka.trigger.include` is evaluated first. If set, only the
listed triggers are eligible. `hosaka.trigger.exclude` is then evaluated against
the remaining set and removes matching entries. A container with neither label
fires all triggers as normal.

### Examples

#### Route a container to one trigger only
```yaml
labels:
  - hosaka.trigger.include=notify
```

#### Route major updates to a pager trigger, minor/patch to a chat trigger
```yaml
labels:
  - hosaka.trigger.include=pager:major-only,chat:minor
```

#### Exclude a noisy container from one trigger
```yaml
labels:
  - hosaka.trigger.exclude=smtp
```

?> See [Triggers](configuration/triggers/) for the full trigger configuration reference.

## Tag candidate filters

Hosaka applies the following automatic filters to the tag list returned by the
registry before comparing candidates to the running tag. These run in addition to
any `hosaka.tag.include` / `hosaka.tag.exclude` regex you set on the container.

- **`.sig` tags are always dropped.** Cosign signature tags (e.g. `1.2.3.sig`)
  would otherwise coerce to a semver value and appear as bogus candidates.

- **`sha`-prefixed tags are dropped** when `hosaka.tag.include` is not set on
  the container. Content-addressed tags (e.g. `sha256-abc123`) are not version
  candidates and would coerce to very high semver values if left in.

- **Tag-prefix propagation** is applied when `hosaka.tag.include` is not set.
  Candidates are limited to tags that share the non-numeric prefix of the
  currently-running tag. For example, a container running `v1.2.3` will only be
  offered `v*` candidates, not bare `1.3.0`. This prevents cross-stream updates
  when an image publishes both prefixed and unprefixed variants.

!> Setting `hosaka.tag.include` disables both the `sha`-prefix drop and the
tag-prefix propagation, giving your regex full control over the candidate set.
