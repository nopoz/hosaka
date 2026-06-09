# FORGEJO
![logo](forgejo.png)

The `forgejo` registry lets you configure a self-hosted [Forgejo](https://forgejo.org/) integration.

### Variables

| Env var                         |    Required    | Description                                                     | Supported values                                      | Default value when missing |
|---------------------------------|:--------------:|-----------------------------------------------------------------|-------------------------------------------------------|----------------------------| 
| `HOSAKA_REGISTRY_FORGEJO_URL`      |  :red_circle:  | Registry URL (e.g. https://forgejo.acme.com)                      |                                                       |                            |
| `HOSAKA_REGISTRY_FORGEJO_LOGIN`    | :white_circle: | Forgejo username                                                | `HOSAKA_REGISTRY_FORGEJO_PASSWORD` must be defined       |                            |
| `HOSAKA_REGISTRY_FORGEJO_PASSWORD` | :white_circle: | Forgejo password                                                | `HOSAKA_REGISTRY_FORGEJO_LOGIN` must be defined          |                            |
| `HOSAKA_REGISTRY_FORGEJO_AUTH`     | :white_circle: | Base64-encoded credentials (alternative to login/password)     | `HOSAKA_REGISTRY_FORGEJO_LOGIN` must not be defined      |                            |
### Examples

#### Configure
<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_REGISTRY_FORGEJO_URL=https://forgejo.acme.com
      - HOSAKA_REGISTRY_FORGEJO_LOGIN=john
      - HOSAKA_REGISTRY_FORGEJO_PASSWORD=doe
```
#### **Docker**
```bash
docker run \
  -e "HOSAKA_REGISTRY_FORGEJO_URL=https://forgejo.acme.com" \
  -e "HOSAKA_REGISTRY_FORGEJO_LOGIN=john" \
  -e "HOSAKA_REGISTRY_FORGEJO_PASSWORD=doe" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->
