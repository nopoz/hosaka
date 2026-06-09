# Script

The `script` trigger executes a local script file mounted inside the Hosaka container.

> Hosaka ships a ready-to-use Portainer update script as the default. If you just
> want one-click Portainer updates, see [Portainer update script](configuration/triggers/script/portainer.md)
> - you do not need to set `PATH` or mount anything.

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

| Env var                                       |    Required    | Description                                                                   | Supported values             | Default value when missing |
|-----------------------------------------------|:--------------:|-------------------------------------------------------------------------------|------------------------------|----------------------------|
| `HOSAKA_TRIGGER_SCRIPT_{trigger_name}_PATH`      | :white_circle: | The absolute path with script file name. Omit to use the bundled Portainer script. | Any local path               | `/scripts/portainer_stack_update.sh` |
| `HOSAKA_TRIGGER_SCRIPT_{trigger_name}_INSTALL`   | :white_circle: | If `true`, makes this a manual Update button trigger in the UI\*              | `true`, `false`              | `false`                    |
| `HOSAKA_TRIGGER_SCRIPT_{trigger_name}_TIMEOUT`   | :white_circle: | The amount of time in milliseconds before considering the script timed out    | integer in ms                | `300000` (5 minutes)       |

\* By setting the INSTALL variable to `true`, this trigger is only executed manually in the containers UI page by clicking the "Update" button next to the upgrade version. Typical scheduled watch triggers for this trigger will not occur when INSTALL is `true`. Only one INSTALL variable can be set across all trigger types - if more than one is set the UI will throw an error and the trigger will not be executed.

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
