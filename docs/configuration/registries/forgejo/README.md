# FORGEJO
![logo](forgejo.png)

The `forgejo` registry lets you configure a self-hosted [Forgejo](https://forgejo.org/) integration.

### Variables

| Env var                         |    Required    | Description                                                     | Supported values                                      | Default value when missing |
|---------------------------------|:--------------:|-----------------------------------------------------------------|-------------------------------------------------------|----------------------------| 
| `HOSAKA_REGISTRY_FORGEJO_URL`      |  :red_circle:  | Registry URL (e.g. https://forgejo.acme.com)                      |                                                       |                            |
| `HOSAKA_REGISTRY_FORGEJO_LOGIN`    | :red_circle:   | Gitea username                                                  | HOSAKA_REGISTRY_FORGEJO_PASSWORD must be defined         |                            |
| `HOSAKA_REGISTRY_FORGEJO_PASSWORD` |  :red_circle:  | Gitea password                                                  | HOSAKA_REGISTRY_FORGEJO_LOGIN must be defined            |                            |
| `HOSAKA_REGISTRY_FORGEJO_AUTH`     | :white_circle: | Htpasswd string (when htpasswd auth is enabled on the registry) | HOSAKA_REGISTRY_FORGEJO_LOGIN/TOKEN  must not be defined |                            |
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
  getwud/wud
```
<!-- tabs:end -->
