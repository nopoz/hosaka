# Basic Authentication

The `basic` authentication lets you protect WUD access using the [Http Basic auth standard](https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication).

### Variables

| Env var                           | Required       | Description              | Supported values                                                                           | Default value when missing |
| --------------------------------- |:--------------:| ------------------------ | ------------------------------------------------------------------------------------------ | -------------------------- | 
| `HOSAKA_AUTH_BASIC_{auth_name}_USER` | :red_circle:   | Username                 |                                                                                            |                            |
| `HOSAKA_AUTH_BASIC_{auth_name}_HASH` | :red_circle:   | Htpasswd compliant hash  | [See htpasswd documentation](https://httpd.apache.org/docs/current/programs/htpasswd.html) |                            |

!> Hash will likely contain `$` signs; don't forget to protect them! \
\
[double `$$` in Docker Compose files](https://docs.docker.com/compose/compose-file/compose-file-v3/#variable-substitution) \
`HOSAKA_AUTH_BASIC_JOHN_HASH: $$apr1$$aefKbZEa$$ZSA5Y3zv9vDQOxr283NGx/` \
\
or use single quotes in Bash commands \
`HOSAKA_AUTH_BASIC_JOHN_HASH='$apr1$aefKbZEa$ZSA5Y3zv9vDQOxr283NGx/'` \
\
or escape them in Bash commands \
`HOSAKA_AUTH_BASIC_JOHN_HASH="\$apr1\$aefKbZEa$ZSA5Y3zv9vDQOxr283NGx/"`

### Examples

<!-- tabs:start -->
#### **Docker Compose**
```yaml
version: '3'

services:
  whatsupdocker:
    image: getwud/wud
    ...
    environment:
      - HOSAKA_AUTH_BASIC_JOHN_USER=john
      - HOSAKA_AUTH_BASIC_JOHN_HASH=$$apr1$$8zDVtSAY$$62WBh9DspNbUKMZXYRsjS/
      - HOSAKA_AUTH_BASIC_JANE_USER=jane
      - HOSAKA_AUTH_BASIC_JANE_HASH=$$apr1$$5iyu65pm$$m/6I35fjUT7.1CMnS2w9d1
      - HOSAKA_AUTH_BASIC_BOB_USER=bob
      - HOSAKA_AUTH_BASIC_BOB_HASH=$apr1$$aefKbZEa$$ZSA5Y3zv9vDQOxr283NGx/
```
#### **Docker**
```bash
docker run \
  -e HOSAKA_AUTH_BASIC_JOHN_USER="john" \
  -e HOSAKA_AUTH_BASIC_JOHN_HASH='$apr1$8zDVtSAY$62WBh9DspNbUKMZXYRsjS/' \
  -e HOSAKA_AUTH_BASIC_JANE_USER="jane" \
  -e HOSAKA_AUTH_BASIC_JANE_HASH='$apr1$5iyu65pm$m/6I35fjUT7.1CMnS2w9d1' \
  -e HOSAKA_AUTH_BASIC_JANE_USER="bob" \
  -e HOSAKA_AUTH_BASIC_JANE_HASH='$apr1$aefKbZEa$ZSA5Y3zv9vDQOxr283NGx/' \    
  ...
  getwud/wud
```
<!-- tabs:end -->

### How to create a password hash
#### You can use htpasswd
```bash
htpasswd -nib john doe

# Output: john:$apr1$8zDVtSAY$62WBh9DspNbUKMZXYRsjS/
```

#### Or you can use an online service
[Like this one](https://wtools.io/generate-htpasswd-online).
