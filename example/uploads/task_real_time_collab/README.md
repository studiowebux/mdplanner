# woodpecker-docker-build

A minimal Woodpecker CI plugin to build and push Docker images. One step, no boilerplate.

## Usage

```yaml
steps:
  build-and-push:
    image: git.webux.dev/studiowebux/woodpecker-docker-build:latest
    settings:
      registry: git.webux.dev
      repo: studiowebux/${CI_REPO_NAME}
      username:
        from_secret: REGISTRY_USERNAME
      password:
        from_secret: REGISTRY_PASSWORD

services:
  docker:
    image: docker:29.4.3-dind
    privileged: true
    environment:
      DOCKER_TLS_CERTDIR: ""
```

## Settings

| Setting       | Required | Default           | Description                              |
|---------------|----------|-------------------|------------------------------------------|
| `registry`    | ✅       |                   | Registry hostname (e.g. `git.webux.dev`) |
| `repo`        | ✅       |                   | Image repo (e.g. `studiowebux/myapp`)    |
| `username`    | ✅       |                   | Registry username                        |
| `password`    | ✅       |                   | Registry password or token               |
| `dockerfile`  | ❌       | `Dockerfile`      | Path to Dockerfile                       |
| `context`     | ❌       | `.`               | Build context path                       |
| `tags`        | ❌       |                   | Extra tags, comma-separated              |
| `build_args`  | ❌       |                   | Build args, comma-separated `KEY=VALUE`  |
| `docker_host` | ❌       | `tcp://docker:2375` | Docker daemon address                  |

## Automatic tags

Every build always produces:
- `:latest`
- `:<CI_COMMIT_SHA>`

## Secrets

Add these as organization-level secrets in Woodpecker so all 70+ repos inherit them:

- `REGISTRY_USERNAME`
- `REGISTRY_PASSWORD`
