# Introduction

[![CI](https://github.com/nopoz/hosaka/actions/workflows/ci.yml/badge.svg)](https://github.com/nopoz/hosaka/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/nopoz/hosaka?sort=semver)](https://github.com/nopoz/hosaka/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/nopoz/hosaka/blob/main/LICENSE)

**Hosaka** watches your Docker hosts for new container image versions, then lets
you react: get notified, or update the container with a single click and watch
the update run live. It keeps pinned versions in your stacks so you always know
what is running, and it never changes anything until you tell it to.

Hosaka is a fork of [What's Up Docker (WUD)](https://github.com/getwud/wud),
rebuilt around a faster, mobile-friendly UI and one-click updates.

## Three concepts

Hosaka is a pipeline built from three kinds of components:

> `WATCHERS` connect to your Docker hosts and list the containers to watch.

> `REGISTRIES` query the Docker registries to find newer image versions.

> `TRIGGERS` perform actions when an update is available (notify, or update).

![image](wud_arch.png)

See [How it works](how-it-works/) for the full watch-and-update cycle.

## Fork highlights

- **One-click updates from the UI**, with the update script's output streamed
  live, line by line.
- **A bundled Portainer stack updater**: rewrites the stack file to the new image
  tag and redeploys through the Portainer API, so your stack stays the source of
  truth and rollback is just redeploying the old tag.
- **A responsive UI** that works on mobile, with live container state over SSE.
- **Semver-aware updates** classified as major, minor, patch, or prerelease, so
  you can take a patch and hold back a major.

For the full pitch and a side-by-side comparison with WUD, see the project
[README](https://github.com/nopoz/hosaka#readme).

## Ready to go?
> [**Follow the quick start guide!**](quickstart/)

## Contact & Support
- Create a [GitHub issue](https://github.com/nopoz/hosaka/issues) for bug reports, feature requests, or questions
- Add a star on [GitHub](https://github.com/nopoz/hosaka) to support the project!

## License
This project is licensed under the [MIT license](https://github.com/nopoz/hosaka/blob/main/LICENSE).
