# Slack
![logo](slack.png)

The `slack` trigger lets you post image update notifications to a Slack channel.

### Variables

| Env var                                    | Required     | Description                      | Supported values | Default value when missing |
| ------------------------------------------ |:------------:| -------------------------------- | ---------------- | -------------------------- | 
| `HOSAKA_TRIGGER_SLACK_{trigger_name}_TOKEN`   | :red_circle: | The Oauth Token of the Slack app |                  |                            |
| `HOSAKA_TRIGGER_SLACK_{trigger_name}_CHANNEL` | :red_circle: | The name of the channel to post  |                  |                            |

!> The Slack channel must already exist on the workspace (the trigger won't automatically create it)

?> This trigger also supports the [common configuration variables](configuration/triggers/?id=common-trigger-configuration).

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
        - HOSAKA_TRIGGER_SLACK_TEST_TOKEN=xoxp-743817063446-xxx
        - HOSAKA_TRIGGER_SLACK_TEST_CHANNEL=hosaka
```

#### **Docker**
```bash
docker run \
    -e HOSAKA_TRIGGER_SLACK_TEST_TOKEN="xoxp-743817063446-xxx" \
    -e HOSAKA_TRIGGER_SLACK_TEST_CHANNEL="hosaka" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->
