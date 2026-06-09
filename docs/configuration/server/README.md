# Server

You can adjust the server configuration with the following environment variables.

### Variables

| Env var                    | Required       | Description                                                                  | Supported values                         | Default value when missing       |
| -------------------------- |:--------------:|----------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------- | 
| `HOSAKA_SERVER_ENABLED`       | :white_circle: | If REST API must be exposed                                                  | `true`, `false`                          | `true`                           |
| `HOSAKA_SERVER_PORT`          | :white_circle: | Http listener port                                                           | from `0` to `65535`                      | `3000`                           |
| `HOSAKA_SERVER_TLS_ENABLED`   | :white_circle: | Enable HTTPS+TLS                                                             | `true`, `false`                          | `false`                          |
| `HOSAKA_SERVER_TLS_KEY`       | :white_circle: | TLS server key (required when `HOSAKA_SERVER_TLS_ENABLED` is enabled)           | File path to the key file                |                                  |
| `HOSAKA_SERVER_TLS_CERT`      | :white_circle: | TLS server certificate (required when `HOSAKA_SERVER_TLS_ENABLED` is enabled)   | File path to the cert file               |                                  |
| `HOSAKA_SERVER_CORS_ENABLED`  | :white_circle: | Enable [CORS](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS) Requests  | `true`, `false`                          | `false`                          |
| `HOSAKA_SERVER_CORS_ORIGIN`   | :white_circle: | Supported CORS origin                                                        |                                          | `*`                              |
| `HOSAKA_SERVER_CORS_METHODS`  | :white_circle: | Supported CORS methods                                                       | Comma separated list of valid HTTP verbs | `GET,HEAD,PUT,PATCH,POST,DELETE` |
| `HOSAKA_SERVER_COOKIE_SECURE` | :white_circle: | Mark the session cookie as Secure (set this when Hosaka sits behind a TLS-terminating reverse proxy) | `true`, `false`             | `false`                          |
| `HOSAKA_SERVER_FEATURE_DELETE`| :white_circle: | If deleting operations are enabled through API & UI                          | `true`, `false`                          | `true`                           |

### Examples

#### Disable http listener

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_SERVER_ENABLED=false
```
#### **Docker**
```bash
docker run \
  -e HOSAKA_SERVER_ENABLED=false \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

#### Set http listener port to 8080

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_SERVER_PORT=8080
```
#### **Docker**
```bash
docker run \
  -e HOSAKA_SERVER_PORT=8080 \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

#### Enable HTTPS

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_SERVER_TLS_ENABLED=true
      - HOSAKA_SERVER_TLS_KEY=/hosaka_certs/server.key
      - HOSAKA_SERVER_TLS_CERT=/hosaka_certs/server.crt
```
#### **Docker**
```bash
docker run \
  -e "HOSAKA_SERVER_TLS_ENABLED=true" \
  -e "HOSAKA_SERVER_TLS_KEY=/hosaka_certs/server.key" \
  -e "HOSAKA_SERVER_TLS_CERT=/hosaka_certs/server.crt" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->
