---
title: Installation
---

# Installation

## Docker

Image:
[`ghcr.io/studiowebux/mdplanner`](https://github.com/studiowebux/mdplanner/pkgs/container/mdplanner)
— multi-platform (amd64, arm64), tagged per release and `latest`.

```bash
git clone https://github.com/studiowebux/mdplanner.git
cd mdplanner
cp deploy/.env.example deploy/.env
# Edit deploy/.env to set PROJECT_DIR and other options
docker compose -f deploy/docker-compose.yml up -d
```

See [Docker Deployment](../02-guides/01-docker-deployment.md) for full
configuration.

## From Source

Requires [Deno 2.x](https://deno.land/).

```bash
git clone https://github.com/studiowebux/mdplanner.git
cd mdplanner
deno task dev:v2 ./example
```
