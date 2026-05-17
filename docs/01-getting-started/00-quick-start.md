---
title: Quick Start
---

# Quick Start

Two ways to get MD Planner v2 running.

## Docker

```bash
git clone https://github.com/studiowebux/mdplanner.git
cd mdplanner
cp deploy/.env.example deploy/.env
# Edit deploy/.env to set PROJECT_DIR and other options
docker compose -f deploy/docker-compose.yml up -d
```

Open `http://localhost:8003`. Project files persist in the directory set by `PROJECT_DIR`.

## From Source

Requires [Deno 2.x](https://deno.land/).

```bash
git clone https://github.com/studiowebux/mdplanner.git
cd mdplanner
deno task dev:v2 ./example
```

Open `http://localhost:8003`. The `./example` directory is used as the project data directory.

## Next Steps

- [Project Setup](02-project-setup.md) — directory layout and `project.md`
  configuration
- [Features](03-features.md) — full feature list
