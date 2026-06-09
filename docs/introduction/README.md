# Introduction

[![CI](https://github.com/nopoz/hosaka/actions/workflows/ci.yml/badge.svg)](https://github.com/nopoz/hosaka/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/nopoz/hosaka?sort=semver)](https://github.com/nopoz/hosaka/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/nopoz/hosaka/blob/main/LICENSE)

## Hosaka
Gets you notified when new versions of your Docker containers are available and lets you react the way you want.

#### Hosaka is built on 3 concepts:

> `WATCHERS` query your Docker hosts to get the containers to watch

> `REGISTRIES` query the Docker registries to find available updates

> `TRIGGERS` perform actions when updates are available

![image](wud_arch.png)

## Many supported triggers
> Send notifications using **Smtp**, [**Apprise**](https://github.com/caronc/apprise-api), [**Ifttt**](https://ifttt.com), [**Pushover**](https://pushover.net), [**Slack**](https://slack.com), [**Telegram**](https://telegram.org/), [**Discord**](https://discord.com/)...

> Automatically update your [**docker**](https://www.docker.com) containers or your [**docker-compose**](https://docs.docker.com/compose) stack.

> Integrate with third-party systems using [**Kafka**](https://kafka.apache.org), [**Mqtt**](https://mqtt.org), **Http Webhooks**...

## Many supported registries
> [**Azure Container Registry**](https://azure.microsoft.com/services/container-registry)

> [**AWS Elastic Container Registry**](https://aws.amazon.com/ecr)

> [**Google Container Registry**](https://cloud.google.com/container-registry)

> [**Github Container Registry**](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-docker-registry)

> [**Docker Hub (public & private repositories)**](http://hub.docker.com)

## REST API & Web UI
![image](../ui/ui.png)

## Good integration with
> [**Home-Assistant**](https://www.home-assistant.io/)

> [**Prometheus**](https://prometheus.io/)

> [**Grafana**](https://grafana.com/)

## Ready to go?
> [**Follow the quick start guide!**](quickstart/)


## Contact & Support
- Create a [GitHub issue](https://github.com/nopoz/hosaka/issues) for bug reports, feature requests, or questions
- Add a star on [GitHub](https://github.com/nopoz/hosaka) to support the project!

## License
This project is licensed under the [MIT license](https://github.com/nopoz/hosaka/blob/main/LICENSE).
