# How it works

Hosaka is a pipeline built from three kinds of components. **Watchers** find the
containers you care about, **registries** tell Hosaka what newer images exist,
and **triggers** act on what is found.

- **Watchers** connect to your Docker hosts, local socket or remote over TCP/TLS,
  and list the running containers. You decide what is watched with a
  `hosaka.watch` label or a watch-by-default setting, so Hosaka only tracks what
  you opt in to.
- **Registries** are the upstream sources Hosaka queries for available tags:
  Docker Hub, GHCR, ECR, GCR, Quay, and the rest. For each watched container it
  picks the registry the image came from and asks what tags exist.
- **Triggers** are the actions that run when an update is available: send a
  notification, update a Docker container or compose stack, or run an update
  script such as the built-in Portainer updater.

## The watch cycle

Each watcher runs on a cron schedule and also reacts to Docker events as
containers start and stop. Every cycle it:

1. Lists the running containers and keeps the ones you have opted in to watch.
2. Parses each container's image into comparable parts: name, tag, and digest.
3. Asks the matching registry for the available tags, then narrows them to real
   candidates. It applies your include/exclude regex and any tag transform, then
   compares with semver to find versions newer than the one running. For mutable
   tags like `latest`, it compares the image digest instead of the tag.
4. When a newer version or a changed digest is found, it builds an update report,
   classifies the change as major, minor, patch, or prerelease, and records it.

Every report is emitted as an event. Triggers subscribe to those events and
decide whether to act based on your rules: only on certain update types
(thresholds), only once per version, notify versus update. Notifications go out
right away; an update waits for you to click it, or runs on its own if you
configured it to.

## When an update runs

Updating recreates the container on the new image, which gives it a new container
ID. Hosaka follows that swap: it confirms the new container is running, forces an
immediate rescan so the list reflects reality, and carries the update state onto
the new container instead of leaving a stale or orphaned row. While the update
runs, the script's output streams to the UI line by line, and the run is not
marked done until the new container comes back healthy.

See [Watchers](configuration/watchers/), [Registries](configuration/registries/),
and [Triggers](configuration/triggers/) to configure each part, and the
[UI page](ui/) for the one-click update experience.
