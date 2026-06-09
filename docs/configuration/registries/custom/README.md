# CUSTOM (Self-hosted Docker Registry)
![logo](custom.png)

The `custom` registry lets you configure a self-hosted [Docker Registry](https://docs.docker.com/registry/) integration.

### Variables

| Env var                        | Required       | Description                                                     | Supported values                                     | Default value when missing |
| ------------------------------ |:--------------:| --------------------------------------------------------------- | ---------------------------------------------------- | -------------------------- | 
| `HOSAKA_REGISTRY_CUSTOM_URL`      | :red_circle:   | Registry URL (e.g. http://localhost:5000)                       |                                                      |                            |
| `HOSAKA_REGISTRY_CUSTOM_LOGIN`    | :white_circle: | Login (when htpasswd auth is enabled on the registry)           | HOSAKA_REGISTRY_CUSTOM_PASSWORD must be defined         |                            |
| `HOSAKA_REGISTRY_CUSTOM_PASSWORD` | :white_circle: | Password (when htpasswd auth is enabled on the registry)        | HOSAKA_REGISTRY_CUSTOM_LOGIN must be defined            |                            |
| `HOSAKA_REGISTRY_CUSTOM_AUTH`     | :white_circle: | Base64-encoded credentials (alternative to login/password)      | `HOSAKA_REGISTRY_CUSTOM_LOGIN` must not be defined      |                            |
### Examples

#### Configure for anonymous access
<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_REGISTRY_CUSTOM_URL=http://localhost:5000
```
#### **Docker**
```bash
docker run \
  -e "HOSAKA_REGISTRY_CUSTOM_URL=http://localhost:5000" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

#### Configure [for Basic Auth](https://docs.docker.com/registry/configuration/#htpasswd)
<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_REGISTRY_CUSTOM_URL=http://localhost:5000
      - HOSAKA_REGISTRY_CUSTOM_LOGIN=john
      - HOSAKA_REGISTRY_CUSTOM_PASSWORD=doe
```
#### **Docker**
```bash
docker run \
  -e "HOSAKA_REGISTRY_CUSTOM_URL=http://localhost:5000" \
  -e "HOSAKA_REGISTRY_CUSTOM_LOGIN=john" \
  -e "HOSAKA_REGISTRY_CUSTOM_PASSWORD=doe" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->
