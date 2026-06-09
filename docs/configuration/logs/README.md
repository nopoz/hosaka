# Logs

You can adjust the log level with env var HOSAKA_LOG_LEVEL.

### Variables

| Env var          | Required       | Description | Supported values            | Default value when missing  |
| ---------------- |:--------------:| ----------- | --------------------------- | --------------------------- | 
| `HOSAKA_LOG_LEVEL`  | :white_circle: | Log level   | error info debug trace      | `info`                      |
| `HOSAKA_LOG_FORMAT` | :white_circle: | Log format  | text json                   | `text`                      |

### Examples

#### Set debug level

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_LOG_LEVEL=debug
```
#### **Docker**
```bash
docker run -e HOSAKA_LOG_LEVEL=debug ... ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

#### Set json format (for ElasticSearch ingestion for example)

<!-- tabs:start -->
#### **Docker**
```bash
docker run -e HOSAKA_LOG_FORMAT=json ... ghcr.io/nopoz/hosaka
```

#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_LOG_FORMAT=json
```
<!-- tabs:end -->
