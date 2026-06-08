# Telegram
![logo](telegram.png)

The `telegram` trigger lets you send realtime notifications using [Telegram](https://telegram.org/) bots.

### Variables

| Env var                                        | Required       | Description   | Supported values                                                                                   | Default value when missing  |
|------------------------------------------------|:--------------:|---------------| -------------------------------------------------------------------------------------------------- |-----------------------------| 
| `HOSAKA_TRIGGER_TELEGRAM_{trigger_name}_BOTTOKEN` | :red_circle:   | The Bot token |                                                                                                    |                             |
| `HOSAKA_TRIGGER_TELEGRAM_{trigger_name}_CHATID`   | :red_circle:   | The Chat ID   |                                                                                                    |                             |

?> This trigger also supports the [common configuration variables](configuration/triggers/?id=common-trigger-configuration).

### Examples

#### Configuration
<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - HOSAKA_TRIGGER_TELEGRAM_1_BOTTOKEN=your-telegram-bot-token
      - HOSAKA_TRIGGER_TELEGRAM_1_CHATID=9876543210
```

#### **Docker**
```bash
docker run \
  -e HOSAKA_TRIGGER_TELEGRAM_1_BOTTOKEN="your-telegram-bot-token" \
  -e HOSAKA_TRIGGER_TELEGRAM_1_CHATID="9876543210" \
  ...
  getwud/wud
```
<!-- tabs:end -->

### How to create a bot and get the bot token
[Follow this tutorial](https://medium.com/geekculture/generate-telegram-token-for-bot-api-d26faf9bf064)

### How to get the chat id
[Follow this tutorial](https://www.alphr.com/find-chat-id-telegram/)
