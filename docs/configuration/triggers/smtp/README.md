# Smtp

The `smtp` trigger lets you send emails with smtp.

### Variables

| Env var                                       | Required       | Description                   | Supported values              | Default value when missing |
| --------------------------------------------- |:--------------:|:----------------------------- | ----------------------------- | -------------------------- | 
| `HOSAKA_TRIGGER_SMTP_{trigger_name}_HOST`        | :red_circle:   | Smtp server host              | Valid hostname or IP address  |                            |
| `HOSAKA_TRIGGER_SMTP_{trigger_name}_PORT`        | :red_circle:   | Smtp server port              | Valid smtp port               |                            |
| `HOSAKA_TRIGGER_SMTP_{trigger_name}_FROM`        | :red_circle:   | Email from address            | Valid email address           |                            |
| `HOSAKA_TRIGGER_SMTP_{trigger_name}_TO`          | :red_circle:   | Email to address              | Valid email address           |                            |
| `HOSAKA_TRIGGER_SMTP_{trigger_name}_USER`        | :white_circle: | Smtp user                     |                               |                            |
| `HOSAKA_TRIGGER_SMTP_{trigger_name}_PASS`        | :white_circle: | Smtp password                 |                               |                            |
| `HOSAKA_TRIGGER_SMTP_{trigger_name}_TLS_ENABLED` | :white_circle: | Use TLS                       | `true`, `false`               | `false`                    |
| `HOSAKA_TRIGGER_SMTP_{trigger_name}_TLS_VERIFY`  | :white_circle: | Verify server TLS certificate | `true`, `false`               | `true`                     |

?> This trigger also supports the [common configuration variables](configuration/triggers/?id=common-trigger-configuration).

### Examples

#### Send an email with Gmail

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
        - HOSAKA_TRIGGER_SMTP_GMAIL_HOST=smtp.gmail.com
        - HOSAKA_TRIGGER_SMTP_GMAIL_PORT=465
        - HOSAKA_TRIGGER_SMTP_GMAIL_USER=john.doe@gmail.com
        - HOSAKA_TRIGGER_SMTP_GMAIL_PASS=mysecretpass
        - HOSAKA_TRIGGER_SMTP_GMAIL_FROM=john.doe@gmail.com
        - HOSAKA_TRIGGER_SMTP_GMAIL_TO=jane.doe@gmail.com
        - HOSAKA_TRIGGER_SMTP_GMAIL_TLS_ENABLED=true 
```

#### **Docker**
```bash
docker run \
    -e HOSAKA_TRIGGER_SMTP_GMAIL_HOST="smtp.gmail.com" \
    -e HOSAKA_TRIGGER_SMTP_GMAIL_PORT="465" \
    -e HOSAKA_TRIGGER_SMTP_GMAIL_USER="john.doe@gmail.com" \
    -e HOSAKA_TRIGGER_SMTP_GMAIL_PASS="mysecretpass" \
    -e HOSAKA_TRIGGER_SMTP_GMAIL_FROM="john.doe@gmail.com" \
    -e HOSAKA_TRIGGER_SMTP_GMAIL_TO="jane.doe@gmail.com" \
    -e HOSAKA_TRIGGER_SMTP_GMAIL_TLS_ENABLED="true" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

!> For Gmail, you need to create an application specific password first ([See gmail documentation](https://security.google.com/settings/security/apppasswords)).