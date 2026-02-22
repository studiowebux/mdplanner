# MD Planner

Markdown-based project management with directory storage.

Bug Tracker: [GitHub Issues](https://github.com/studiowebux/mdplanner/issues) |
Discord: [discord.gg/BG5Erm9fNv](https://discord.gg/BG5Erm9fNv)

[Buy Me a Coffee](https://buymeacoffee.com/studiowebux) |
[GitHub Sponsors](https://github.com/sponsors/studiowebux) |
[Patreon](https://patreon.com/studiowebux)

## About

MD Planner is a project management tool that stores all data in a directory of
markdown files. Each entity (task, note, goal, idea, person, etc.) is one `.md`
file with YAML frontmatter. No external database. Human-readable. Git-friendly.

25+ views: tasks/kanban, notes, goals, ideas, milestones, retrospectives,
canvas, mindmap, C4 architecture, strategic levels, capacity planning, billing,
CRM, time tracking, portfolio, org chart, people registry, MoSCoW, Eisenhower
matrix, idea sorter, SWOT, risk, lean canvas, business model canvas, and more.

## Installation

### Pre-built Binary

Download from
[GitHub Releases](https://github.com/studiowebux/mdplanner/releases):

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

### Docker

```bash
git clone https://github.com/studiowebux/mdplanner.git
cd mdplanner
mkdir -p data
docker run --rm -v "$(pwd)/data:/data" $(docker build -q .) init /data
docker compose up -d
```

Open `http://localhost:8003`. Project files persist in `./data/`.

### From Source

Requires [Deno 2.x](https://deno.land/).

```bash
git clone https://github.com/studiowebux/mdplanner.git
cd mdplanner
deno task dev ./example
```

Full documentation: [docs/user-guide.md](docs/user-guide.md)

## Getting Started

```bash
# Initialize a new project
mdplanner init ./my-project

# Start the server
mdplanner ./my-project

# With SQLite cache for fast search
mdplanner --cache ./my-project

# Custom port
mdplanner --port 8080 ./my-project
```

Open `http://localhost:8003`. The project directory contains one `.md` file per
entity. Edit files directly or use the web UI — both work.

## Contributing

Fork, branch, PR. Follow the branch naming convention: `feat/`, `fix/`,
`refactor/`, `docs/`, `chore/`. Run checks before submitting:

```bash
deno fmt --check
deno lint
deno check main.ts
deno task test
```

## License

GPL-3.0

## Contact

[Studio Webux](https://studiowebux.com) |
[Discord](https://discord.gg/BG5Erm9fNv) | tommy@studiowebux.com
