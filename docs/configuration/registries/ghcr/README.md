# GHCR (Github Container Registry)
![logo](github.png)

The `ghcr` registry lets you configure [GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-docker-registry) integration.

### Variables

| Env var                      | Required       | Description     | Supported values                         | Default value when missing |
| ---------------------------- |:--------------:| --------------- | ---------------------------------------- | -------------------------- | 
| `HOSAKA_REGISTRY_GHCR_USERNAME` | :white_circle: | Github username |                                          |                            |
| `HOSAKA_REGISTRY_GHCR_TOKEN`    | :white_circle: | Github token    | Github password or Github Personal Token |                            |

### Examples

#### Configure to access public images (no credentials needed)

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_REGISTRY_GHCR=
```
#### **Docker**
```bash
docker run \
  -e HOSAKA_REGISTRY_GHCR= \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

#### Configure to access private images (credentials needed)

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_REGISTRY_GHCR_USERNAME=john@doe
      - HOSAKA_REGISTRY_GHCR_TOKEN=xxxxx 
```
#### **Docker**
```bash
docker run \
  -e HOSAKA_REGISTRY_GHCR_USERNAME="john@doe" \
  -e HOSAKA_REGISTRY_GHCR_TOKEN="xxxxx" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

### How to create a Github Personal Token
#### Go to your Github settings and open the Personal Access Token tab
[Click here](https://github.com/settings/tokens)

#### Click on `Generate new token`
Choose an expiration time & appropriate scopes (`read:packages` is only needed for Hosaka) and generate.
![image](ghcr_01.png)

#### Copy the token & use it as the HOSAKA_REGISTRY_GHCR_TOKEN value
![image](ghcr_02.png)
