---
title: Installation
---

# Installation

## Pre-built Binary

Download the binary for your platform from
[GitHub Releases](https://github.com/studiowebux/mdplanner/releases).

| Platform    | Binary                  |
| ----------- | ----------------------- |
| Linux x64   | `mdplanner-linux`       |
| macOS Intel | `mdplanner-macos-intel` |
| macOS ARM   | `mdplanner-macos-arm`   |
| Windows x64 | `mdplanner-windows.exe` |

```bash
chmod +x mdplanner-macos-arm
./mdplanner-macos-arm ./my-project
```

## Docker

Image:
[`ghcr.io/studiowebux/mdplanner`](https://github.com/studiowebux/mdplanner/pkgs/container/mdplanner)
— multi-platform (amd64, arm64), tagged per release and `latest`.

```bash
mkdir mdplanner && cd mdplanner
curl -fsSLO https://raw.githubusercontent.com/studiowebux/mdplanner/main/deploy/quick-start/docker-compose.yml
docker compose up -d
```

See [Docker Deployment](../02-guides/01-docker-deployment.md) for full
configuration.

## From Source

Requires [Deno 2.x](https://deno.land/).

```bash
git clone https://github.com/studiowebux/mdplanner.git
cd mdplanner
deno task dev ./example
```

### Compile a standalone binary

```bash
deno task compile:macos-arm     # Apple Silicon
deno task compile:macos-intel   # Intel Mac
deno task compile:linux         # Linux x86_64
deno task compile:windows       # Windows x86_64
deno task compile:all           # All platforms
```

Binaries are written to `dist/`.
