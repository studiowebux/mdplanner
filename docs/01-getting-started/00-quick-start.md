# Quick Start

Three ways to get MD Planner running.

## Binary

Download from
[GitHub Releases](https://github.com/studiowebux/mdplanner/releases).

```bash
chmod +x mdplanner-macos-arm
./mdplanner-macos-arm init ./my-project
./mdplanner-macos-arm ./my-project
```

Open `http://localhost:8003`.

## Docker

```bash
mkdir mdplanner && cd mdplanner
curl -fsSLO https://raw.githubusercontent.com/studiowebux/mdplanner/main/deploy/quick-start/docker-compose.yml
docker compose up -d
```

Open `http://localhost:8003`. Project files persist in `./data/`.

## From Source

Requires [Deno 2.x](https://deno.land/).

```bash
git clone https://github.com/studiowebux/mdplanner.git
cd mdplanner
deno task dev ./example
```

## Next Steps

- [Project Setup](02-project-setup.md) — directory layout and `project.md`
  configuration
- [Features](03-features.md) — full feature list
- [CLI Reference](../03-reference/01-cli.md) — all flags and commands
