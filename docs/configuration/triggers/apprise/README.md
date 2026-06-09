# Apprise
![logo](apprise.png)

The `apprise` trigger lets you send container update notifications via the [Apprise API](https://github.com/caronc/apprise-api).

### Variables

| Env var                                     |    Required    | Description                                                             | Supported values                                                                                                           | Default value when missing |
|---------------------------------------------|:--------------:|-------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|----------------------------| 
| `HOSAKA_TRIGGER_APPRISE_{trigger_name}_URL`    | :red_circle:   | The Base URL of the Apprise API                                         |                                                                                                                            |                            |
| `HOSAKA_TRIGGER_APPRISE_{trigger_name}_URLS`   | :white_circle: | The comma separated list of Apprise service urls                        | [See the list of the supported Apprise notification URLs](https://github.com/caronc/apprise#popular-notification-services) |                            |
| `HOSAKA_TRIGGER_APPRISE_{trigger_name}_CONFIG` | :white_circle: | The name of an Apprise yaml configuration                               | [See Apprise persistent configuration documentation](https://github.com/caronc/apprise/wiki/config_yaml)                   |                            |
| `HOSAKA_TRIGGER_APPRISE_{trigger_name}_TAG`    | :white_circle: | The optional tags(s) to expand when using an Apprise yaml configuration | [See Apprise persistent configuration documentation](https://github.com/caronc/apprise/wiki/config_yaml)                   |                            |

?> This trigger also supports the [common configuration variables](configuration/triggers/?id=common-trigger-configuration).

### Examples

#### Send a Mail & an SMS

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_TRIGGER_APPRISE_LOCAL_URL=http://apprise:8000
      - HOSAKA_TRIGGER_APPRISE_LOCAL_URLS=mailto://john.doe:secret@gmail.com,sns://AHIAJGNT76XIMXDBIJYA/bu1dHSdO22pfaaVy/wmNsdljF4C07D3bndi9PQJ9/us-east-2/+1(800)555-1223
```
#### **Docker**
```bash
docker run \
  -e HOSAKA_TRIGGER_APPRISE_LOCAL_URL="http://apprise:8000" \
  -e HOSAKA_TRIGGER_APPRISE_LOCAL_URLS="mailto://john.doe:secret@gmail.com,sns://AHIAJGNT76XIMXDBIJYA/bu1dHSdO22pfaaVy/wmNsdljF4C07D3bndi9PQJ9/us-east-2/+1(800)555-1223" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

#### Use a persistent YAML configuration

Declare a YAML Apprise configuration ([see here](https://github.com/caronc/apprise/wiki/config_yaml)) ; let's call it `hosaka.yml` for example.
```yaml
# hosaka.yml example
urls:
  - tgram://{bot_token}/{chat_id}:
    - tag: devops
```
<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_TRIGGER_APPRISE_LOCAL_URL=http://apprise:8000
      - HOSAKA_TRIGGER_APPRISE_LOCAL_CONFIG=hosaka # the name of the yaml config file
      - HOSAKA_TRIGGER_APPRISE_LOCAL_TAG=devops # the tags to use with the config (optional)
```
#### **Docker**
```bash
docker run \
  -e HOSAKA_TRIGGER_APPRISE_LOCAL_URL="http://apprise:8000" \
  -e HOSAKA_TRIGGER_APPRISE_LOCAL_CONFIG="hosaka" \
  -e HOSAKA_TRIGGER_APPRISE_LOCAL_TAG="devops" \  
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

### How to run the Apprise API?
Just run the official [Apprise Docker image](https://hub.docker.com/r/caronc/apprise).

For more information, check out the [official Apprise API documentation](https://github.com/caronc/apprise-api). 

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  apprise:
    image: caronc/apprise
    container_name: apprise
```
#### **Docker**
```bash
docker run caronc/apprise
```
<!-- tabs:end -->