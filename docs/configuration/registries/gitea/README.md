# GITEA
![logo](gitea.png)

The `gitea` registry lets you configure a self-hosted [Gitea](https://gitea.com) integration.

### Variables

| Env var                       |    Required    | Description                                                     | Supported values                                    | Default value when missing |
|-------------------------------|:--------------:|-----------------------------------------------------------------|-----------------------------------------------------|----------------------------| 
| `HOSAKA_REGISTRY_GITEA_URL`      |  :red_circle:  | Registry URL (e.g. https://gitea.acme.com)                      |                                                     |                            |
| `HOSAKA_REGISTRY_GITEA_LOGIN`    | :red_circle:   | Gitea username                                                  | HOSAKA_REGISTRY_GITEA_PASSWORD must be defined         |                            |
| `HOSAKA_REGISTRY_GITEA_PASSWORD` |  :red_circle:  | Gitea password                                                  | HOSAKA_REGISTRY_GITEA_LOGIN must be defined            |                            |
| `HOSAKA_REGISTRY_GITEA_AUTH`     | :white_circle: | Htpasswd string (when htpasswd auth is enabled on the registry) | HOSAKA_REGISTRY_GITEA_LOGIN/TOKEN  must not be defined |                            |
### Examples

#### Configure
<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  whatsupdocker:
    image: getwud/wud
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
  getwud/wud
```
<!-- tabs:end -->
