# Quick start

## Run the Docker image
The easiest way to start is to deploy the official _**Hosaka**_ image.

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    container_name: hosaka
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    ports:
      - 3000:3000
```
#### **Docker**
```bash
docker run -d --name hosaka \
  -v "/var/run/docker.sock:/var/run/docker.sock" \
  -p 3000:3000 \
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

?> Hosaka is available on GitHub Container Registry: `ghcr.io/nopoz/hosaka`

## Open the UI
[Open the UI](http://localhost:3000) in a browser and check that everything is working as expected.

## Add your first trigger
?> Everything ok? \
It's time to [**add some triggers**](configuration/triggers/)!

## Going deeper...

?> Need to fine configure how Hosaka must watch your containers? \
Take a look at the [**watcher documentation**](configuration/watchers/)!
  
?> Need to integrate other registries (ECR, GCR...)? \
Take a look at the [**registry documentation**](configuration/registries/).

## Ready-to-go examples
?> You can find here a **[complete configuration example](configuration/?id=complete-example)** illustrating some common Hosaka options.