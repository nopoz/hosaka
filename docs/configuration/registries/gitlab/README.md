# GHCR (Gitlab Container Registry)
![logo](gitlab.png)

The `gitlab` registry lets you configure [GITLAB](https://docs.gitlab.com/ee/user/packages/container_registry/) integration.

### Variables

| Env var                       |   Required   | Description                    | Supported values                         | Default value when missing  |
|-------------------------------|:------------:|--------------------------------| ---------------------------------------- |-----------------------------| 
| `HOSAKA_REGISTRY_GITLAB_URL`     | :red_circle: | Gitlab Registry base url       |                                          | https://registry.gitlab.com |
| `HOSAKA_REGISTRY_GITLAB_AUTHURL` | :red_circle: | Gitlab Authentication base url |                                          | https://gitlab.com          |
| `HOSAKA_REGISTRY_GITLAB_TOKEN`   | :red_circle: | Gitlab Personal Access Token   |                                          |                             |

### Examples

#### Configure to access images from gitlab.com

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_REGISTRY_GITLAB_TOKEN=xxxxx 
```
#### **Docker**
```bash
docker run \
  -e HOSAKA_REGISTRY_GITLAB_TOKEN="xxxxx" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

#### Configure to access images from self hosted gitlab instance

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_REGISTRY_GITLAB_URL=https://registry.mygitlab.acme.com
      - HOSAKA_REGISTRY_GITLAB_AUTHURL=https://mygitlab.acme.com
      - HOSAKA_REGISTRY_GITLAB_TOKEN=xxxxx 
```
#### **Docker**
```bash
docker run \
  -e HOSAKA_REGISTRY_GITLAB_URL="https://registry.mygitlab.acme.com"
  -e HOSAKA_REGISTRY_GITLAB_AUTHURL="https://mygitlab.acme.com"
  -e HOSAKA_REGISTRY_GITLAB_TOKEN="xxxxx" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

### How to create a Gitlab Personal Access Token
#### Go to your Gitlab settings and open the Personal Access Token page
[Click here](https://gitlab.com/-/profile/personal_access_tokens)

#### Enter the details of the token to be created
Choose an expiration time & appropriate scopes (`read_registry` is only needed for Hosaka) and generate.
![image](gitlab_01.png)

#### Copy the token & use it as the HOSAKA_REGISTRY_GITLAB_TOKEN value
![image](gitlab_02.png)