# Docker
![logo](docker.png)

The `docker` trigger lets you replace existing containers with their updated versions.

The trigger will: 
- Clone the existing container specification
- Pull the new image
- Stop the existing container
- Remove the existing container
- Create the new container
- Start the new container (if the previous one was running)
- Remove the previous image (optionally)

### Variables

| Env var                                    | Required       | Description                                         | Supported values | Default value when missing |
| ------------------------------------------ |:--------------:|-----------------------------------------------------| ---------------- | -------------------------- | 
| `HOSAKA_TRIGGER_DOCKER_{trigger_name}_PRUNE`  | :white_circle: | If old image versions must be pruned                | `true`, `false`  | `false`                    |
| `HOSAKA_TRIGGER_DOCKER_{trigger_name}_DRYRUN` | :white_circle: | When enabled, only pull the new image ahead of time | `true`, `false`  | `false`                    |

?> This trigger also supports the [common configuration variables](configuration/triggers/?id=common-trigger-configuration).

?> This trigger picks up the Docker configuration from the [configured Docker watchers](configuration/watchers/) so it can handle updates on Local **and** Remote Docker hosts. 

### Examples

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_TRIGGER_DOCKER_EXAMPLE_PRUNE=true
```
#### **Docker**
```bash
docker run \
  -e "HOSAKA_TRIGGER_DOCKER_EXAMPLE_PRUNE=true" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->
