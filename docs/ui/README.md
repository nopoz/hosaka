# UI

In addition to the REST API, Hosaka exposes a web UI on the same port.

> [**http://localhost:3000**](http://localhost:3000)

## One-click container updates

Each container row with an available update shows an **Update** button. Clicking
it sends `POST /api/containers/:id/install` to the backend, which hands off to
whichever trigger has `INSTALL=true` configured (typically the
[script trigger](configuration/triggers/script/)). The button is shown whenever
an install-mode trigger is configured; if more than one is set, clicking it
surfaces an error notification instead of running the install.

## Live install output

When an install runs, a dialog opens and streams the script's stdout and stderr
in real time over a Server-Sent Events connection at
`GET /api/containers/:id/install/logs`. The stream stays open until the script
exits, so you can follow the progress of a Portainer stack redeploy or any
other update script without polling.

## Live container state

The container list updates in place without a full-page refresh. The UI holds an
SSE connection to `GET /api/containers/stream`, which pushes container-state
changes as they are written to the store. Only real state changes produce events,
so there is no event flood during idle periods or between watch cycles.

## Responsive mobile layout

The container list adapts to narrow viewports. On small screens the table header
and some columns collapse to keep the most relevant information visible without
horizontal scrolling.

## Multi-key container sort

The filter bar exposes a **Sort** dropdown with three sort keys:

- **Name** (default) - alphabetical by container name
- **Update type** - groups containers by semver diff severity, then by name
- **Watcher** - groups containers by the watcher that monitors them, then by name

The selected sort key is remembered for the browser session.

## Semver color ladder

The update icon in each row is tinted to reflect the severity of the available
change. Each rung maps to a Vuetify theme token rather than a fixed color, so the
exact hue follows whichever theme is active:

| Semver diff  | Theme token  | Meaning                   |
|--------------|--------------|---------------------------|
| `major`      | `error`      | highest-severity update   |
| `minor`      | `warning`    | mid-severity update       |
| `patch`      | `success`    | low-severity update       |
| `prerelease` | `prerelease` | distinct pre-release rung  |

`prerelease` is a dedicated theme token (not reused from `error`/`warning`/
`success`) so pre-release candidates stay visually distinct from stable releases
without implying more or less urgency than a patch.

## Update-lifecycle reliability

Container recreation (new Docker id, same name) is tracked across the watch
cycle. The SSE stream is key-stable through recreation events, so the UI row
stays pinned and the install-output dialog is not torn down mid-script. The
watcher emits store updates only when state actually changes, keeping the event
stream quiet between cycles.
