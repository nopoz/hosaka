# Storage
  
If you want the state to persist after the container removal, you need to mount  ```/store``` as a volume.

### Variables

| Env var               | Required       | Description                        | Default value when missing |
| --------------------- |:--------------:| ---------------------------------- | -------------------------- |
| `HOSAKA_STORE_PATH`   | :white_circle: | Directory where the store file lives | `/store`                 |
| `HOSAKA_STORE_FILE`   | :white_circle: | Store filename                     | `hosaka.json`              |

### Examples 

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    volumes:
      - /path-on-my-host:/store
```
#### **Docker**
```bash
docker run \
  -v /path-on-my-host:/store
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->
