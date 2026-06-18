# AI update analysis

Hosaka can analyze an available update on demand and tell you what changed
between the version you run and the one on offer. It is **off by default** and
runs **only when you ask** for it.

When configured, every container row with an available update shows an
**Analyze** button (a search-eye icon). Clicking it opens a dialog that shows:

- an overall **risk level**: `none`, `low`, `medium`, or `high`
- a short **overview** of the upgrade
- the **breaking changes**, each attributed to the version that introduced it
- the notable non-breaking **changes**
- links to the **source** release notes

Behind the scenes Hosaka gathers the release notes between your current and
target version (from GitHub Releases, following linked changelogs, with a
fallback to the release page a `hosaka.link.template` points at) and asks
[Google Gemini](https://ai.google.dev/) to summarize them into the structured
result above. Results are cached per container and version pair; **Regenerate**
in the dialog re-runs the analysis.

The button only appears when an API key is set. Without one, the feature stays
hidden and no AI calls are ever made.

### Variables

| Env var                    | Required       | Description                                                                                  | Supported values                | Default value when missing |
| -------------------------- |:--------------:|--------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------- |
| `HOSAKA_AI_GEMINI_APIKEY`  | :white_circle: | Google Gemini API key. Setting it enables the feature and shows the **Analyze** button       | A Gemini API key                |                            |
| `HOSAKA_AI_GEMINI_MODEL`   | :white_circle: | Gemini model used for the analysis                                                            | A Gemini model id               | `gemini-3.1-flash-lite`    |
| `HOSAKA_AI_GITHUB_TOKEN`   | :white_circle: | GitHub token used when fetching release notes; raises the GitHub API rate limit              | A GitHub personal access token  |                            |
| `HOSAKA_AI_PROVIDER`       | :white_circle: | AI provider                                                                                   | `gemini`                        | `gemini`                   |

All of these support the `__FILE` suffix (Docker secrets); see
[Secret management](/configuration/#secret-management).

### Getting a key

Create a Google Gemini API key in
[Google AI Studio](https://aistudio.google.com/apikey) and set it as
`HOSAKA_AI_GEMINI_APIKEY`. A `GITHUB_TOKEN` is optional: unauthenticated GitHub
API calls are rate-limited, so a token helps if you analyze many updates in a
short window.

### Privacy

Enabling this feature sends the gathered release-note text, the image name, and
the two version tags to Google Gemini for summarization. It sends only public
release notes, never your container configuration or secrets, and only when you
click **Analyze**. Leave `HOSAKA_AI_GEMINI_APIKEY` unset to keep the feature off
entirely.

### Examples

#### Enable update analysis

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_AI_GEMINI_APIKEY=AIza...
      # Optional:
      # - HOSAKA_AI_GEMINI_MODEL=gemini-3.1-flash-lite
      # - HOSAKA_AI_GITHUB_TOKEN=ghp_xxxxxxxx
```
#### **Docker**
```bash
docker run \
  -e "HOSAKA_AI_GEMINI_APIKEY=AIza..." \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->

#### Load the key from a Docker secret

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  hosaka:
    image: ghcr.io/nopoz/hosaka
    ...
    environment:
      - HOSAKA_AI_GEMINI_APIKEY__FILE=/run/secrets/gemini_api_key
```
#### **Docker**
```bash
docker run \
  -e "HOSAKA_AI_GEMINI_APIKEY__FILE=/run/secrets/gemini_api_key" \
  ...
  ghcr.io/nopoz/hosaka
```
<!-- tabs:end -->
