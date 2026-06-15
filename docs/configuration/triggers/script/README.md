# Script

The `script` trigger runs an action when an update is found: either Hosaka's
built-in Portainer updater (the default) or a local script file you mount in.

> Hosaka's built-in Portainer updater is the default. If you just want one-click
> Portainer updates, see [Portainer update script](configuration/triggers/script/portainer.md)
> - you do not need to set `PATH` or mount anything.

## Notify mode vs install mode

The script trigger operates in one of two modes depending on the `INSTALL` setting.

**Notify mode** (`INSTALL=false`, the default): the script fires automatically
on the normal watch schedule whenever an update is detected. Use this to send a
notification, run a webhook, or do any automated action that does not require
user confirmation.

**Install mode** (`INSTALL=true`): the script is only executed when a user
clicks the **Update** button in the container row. The scheduled watch still
detects the update and shows the button, but the script itself does not run
automatically. Only one install-mode trigger may exist across all trigger types;
configuring more than one causes the UI to surface an error.

## Live script output

In install mode, the update output is streamed line-by-line to the UI in real
time over a Server-Sent Events connection (for an external script, that is its
stdout and stderr). A console dialog opens automatically when the install starts
and stays open until the run finishes, letting you watch progress without polling.

## Script parameters

Parameters passed to the script in this order are:
1. container name
2. image name
3. current version
4. upgrade version
5. Hosaka watcher name
6. compose project name

For example, `/script/myscript.sh 'my plex container' 'plex' '1.0.0' '2.0.0' 'local' 'plex compose project'`

Supported shells for scripts are `/bin/bash`, `/bin/ash`, and `/bin/sh`.

#### Variables

| Env var                                          |    Required    | Description                                                                                  | Supported values             | Default value when missing           |
|--------------------------------------------------|:--------------:|----------------------------------------------------------------------------------------------|------------------------------|--------------------------------------|
| `HOSAKA_TRIGGER_SCRIPT_{trigger_name}_PATH`      | :white_circle: | Absolute path to a script file inside the container. Omit to use the built-in Portainer updater. | Any local path               | `built-in`                           |
| `HOSAKA_TRIGGER_SCRIPT_{trigger_name}_INSTALL`   | :white_circle: | If `true`, switches to install mode (manual Update button only - see above)                  | `true`, `false`              | `false`                              |
| `HOSAKA_TRIGGER_SCRIPT_{trigger_name}_TIMEOUT`   | :white_circle: | Milliseconds before the script execution is considered timed out                             | integer in ms                | `300000` (5 minutes)                 |

### Examples

#### Specify the local script file inside the Hosaka container

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka:latest
    ...
    environment:
      - HOSAKA_TRIGGER_SCRIPT_MYSCRIPT_PATH=/scripts/myscript.sh
      - HOSAKA_TRIGGER_SCRIPT_MYSCRIPT_INSTALL=true
    volumes:
      - /hostpath/myscript.sh:/scripts/myscript.sh
```
#### **Docker**
```bash
docker run \
-e HOSAKA_TRIGGER_SCRIPT_MYSCRIPT_PATH=/scripts/myscript.sh \
-e HOSAKA_TRIGGER_SCRIPT_MYSCRIPT_INSTALL=true \
-v /hostpath/myscript.sh:/scripts/myscript.sh \
ghcr.io/nopoz/hosaka:latest
```
<!-- tabs:end -->

#### Example of parameters passed to script - container name, container image name, current version, upgrade version, Hosaka watcher name, compose project name
```bash
/scripts/myscript.sh 'my plex container' 'plex' '1.0.0' '2.0.0' 'local' 'plex compose project'
```
