# Logs

You can adjust the log level with env var HOSAKA_LOG_LEVEL.

### Variables

| Env var          | Required       | Description | Supported values            | Default value when missing  |
| ---------------- |:--------------:| ----------- | --------------------------- | --------------------------- | 
| `HOSAKA_LOG_LEVEL`  | :white_circle: | Log level   | error info debug trace      | `info`                      |

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
