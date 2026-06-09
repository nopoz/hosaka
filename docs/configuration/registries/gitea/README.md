# GITEA
![logo](gitea.png)

The `gitea` registry lets you configure a self-hosted [Gitea](https://gitea.com) integration.

### Variables

| Env var                       |    Required    | Description                                                     | Supported values                                    | Default value when missing |
|-------------------------------|:--------------:|-----------------------------------------------------------------|-----------------------------------------------------|----------------------------| 
| `HOSAKA_REGISTRY_GITEA_URL`      |  :red_circle:  | Registry URL (e.g. https://gitea.acme.com)                      |                                                     |                            |
| `HOSAKA_REGISTRY_GITEA_LOGIN`    | :white_circle: | Gitea username                                                  | `HOSAKA_REGISTRY_GITEA_PASSWORD` must be defined       |                            |
| `HOSAKA_REGISTRY_GITEA_PASSWORD` | :white_circle: | Gitea password                                                  | `HOSAKA_REGISTRY_GITEA_LOGIN` must be defined          |                            |
| `HOSAKA_REGISTRY_GITEA_AUTH`     | :white_circle: | Base64-encoded credentials (alternative to login/password)     | `HOSAKA_REGISTRY_GITEA_LOGIN` must not be defined      |                            |
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
      - HOSAKA_REGISTRY_GITEA_URL=https://gitea.acme.com
      - HOSAKA_REGISTRY_GITEA_LOGIN=john
      - HOSAKA_REGISTRY_GITEA_PASSWORD=doe
```
#### **Docker**
```bash
docker run \
  -e "HOSAKA_REGISTRY_GITEA_URL=https://gitea.acme.com/" \
  -e "HOSAKA_REGISTRY_GITEA_LOGIN=john" \
  -e "HOSAKA_REGISTRY_GITEA_PASSWORD=doe" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->
