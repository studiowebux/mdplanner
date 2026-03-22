<div align="center">
  <img src="icon.png" alt="MD Planner" width="120" />
</div>

# MD Planner

> 2026-03-22: Complete overhaul to get a proper codebase / V1 release. Plan is to be compatible as much as possible with this alpha version. This is my main focus for the next few weeks.

Markdown-based project management with directory storage.

Bug Tracker:
[GitHub Issues](https://github.com/studiowebux/mdplanner/issues)<br> Discord:
[discord.gg/BG5Erm9fNv](https://discord.gg/BG5Erm9fNv)

## Funding

[Buy Me a Coffee](https://buymeacoffee.com/studiowebux)<br>
[GitHub Sponsors](https://github.com/sponsors/studiowebux)<br>
[Patreon](https://patreon.com/studiowebux)

## Why this project exists?

I wanted a project management tool that stores everything as plain markdown
files in a directory. No database, no external dependencies, no recurring fees.
Just `.md` files with YAML frontmatter that I can read, edit, and version with
git. MD Planner is that tool.

## Features

Every feature can be hidden or shown from Settings > Feature Visibility. Start
with what you need, enable the rest when you grow into it.

### Tasks

| Feature      | Description                                                            |
| ------------ | ---------------------------------------------------------------------- |
| **List**     | Filterable task list with sections, assignees, milestones, and sorting |
| **Board**    | Kanban board organized by section columns                              |
| **Timeline** | Gantt chart for task schedules and dependencies                        |

### Planning

| Feature            | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| **Goals**          | Track goals with status, timeline, and KPI targets             |
| **Milestones**     | Version-based milestones with target dates and progress        |
| **Ideas**          | Idea repository with categories, priority, and task conversion |
| **Brainstorm**     | Guided question-and-answer sessions for exploring ideas        |
| **Reflection**     | Template-driven recurring self-inquiry with immutable sessions |
| **Retrospectives** | Start/stop/continue retrospective format                       |
| **MoSCoW**         | Must/Should/Could/Won't prioritization matrix                  |
| **Eisenhower**     | Importance/Urgency decision matrix                             |
| **Idea Sorter**    | Interactive tool to rank and sort ideas                        |

### Strategy

| Feature             | Description                                               |
| ------------------- | --------------------------------------------------------- |
| **SWOT**            | Strengths/Weaknesses/Opportunities/Threats analysis       |
| **Risk Analysis**   | Risk matrix plotting impact vs probability                |
| **Lean Canvas**     | One-page business model canvas                            |
| **Business Model**  | Nine-component business model canvas                      |
| **Value Board**     | Project value proposition and impact tracking             |
| **Brief**           | Project brief with RACI matrix, mission, and principles   |
| **Marketing Plans** | Campaign planning with channels, audiences, budgets, KPIs |

### Finances

| Feature         | Description                                             |
| --------------- | ------------------------------------------------------- |
| **Fundraising** | Investor pipeline, SAFE agreements, runway, KPI targets |
| **Billing**     | Invoices, quotes, customers, payment tracking           |
| **Finances**    | Revenue/expense tracking, cash position, periods        |

### Diagrams

| Feature             | Description                                             |
| ------------------- | ------------------------------------------------------- |
| **Canvas**          | Free-form sticky note canvas for brainstorming          |
| **Mindmap**         | Hierarchical mind mapping with node editing             |
| **C4 Architecture** | C4 model diagrams (context, container, component, code) |
| **Fishbone**        | Ishikawa cause-and-effect analysis                      |

### Team

| Feature           | Description                                  |
| ----------------- | -------------------------------------------- |
| **Org Chart**     | Organizational hierarchy visualization       |
| **People**        | Team member profiles, roles, departments     |
| **Capacity**      | Weekly allocation planning by project        |
| **Time Tracking** | Time entry logging and project-based hours   |
| **CRM**           | Companies, contacts, deals, interactions     |
| **Onboarding**    | Employee onboarding checklists and templates |

### Notes

| Feature              | Description                                                   |
| -------------------- | ------------------------------------------------------------- |
| **Notes**            | Searchable note library with basic and enhanced editing modes |
| **Strategic Levels** | Hierarchical strategy documents linking goals to execution    |
| **Meetings**         | Meeting notes with attendees, agenda, action items            |
| **Journal**          | Personal journal entries with mood tracking                   |
| **Habits**           | Habit tracking with completion streaks                        |

### Portfolio and Tools

| Feature          | Description                                        |
| ---------------- | -------------------------------------------------- |
| **Portfolio**    | Project showcase with status, timeline, team, KPIs |
| **Quick Search** | Command palette (Cmd+K) for fast navigation        |
| **AI Chat**      | Ollama integration for local LLM conversations     |
| **Analytics**    | Dashboard with task completion and goal progress   |
| **Uploads**      | File upload and management                         |
| **Backup**       | TAR + AES-256-GCM encrypted backup and restore     |

### Infrastructure

| Feature          | Description                                                |
| ---------------- | ---------------------------------------------------------- |
| **DNS Tracker**  | Domain expiry and DNS record management (Cloudflare sync)  |
| **GitHub**       | Repository and issue integration                           |
| **MCP Server**   | Model Context Protocol server (stdio + HTTP) for AI agents |
| **WebDAV**       | WebDAV protocol for calendar and file sync                 |
| **SQLite Cache** | Optional FTS5 full-text search acceleration                |
| **SSE**          | Server-sent events for real-time updates across clients    |

### AI Agent Integration

MD Planner ships with a built-in MCP server. Connect it to Claude Code and your
entire project becomes accessible — tasks, notes, goals, milestones, decisions,
all of it. Claude reads context before coding, creates tasks before working, and
writes decisions back when done. One place to plan, track, and build.

## Installation

MD Planner runs locally or on a trusted network. Use `--api-token` to protect
the REST API and UI with cookie-based authentication. Use `--mcp-token` to
protect the MCP endpoint with a bearer token. For public-facing deployments,
combine with a reverse proxy and TLS.

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
mkdir mdplanner && cd mdplanner
wget https://raw.githubusercontent.com/studiowebux/mdplanner/main/deploy/quick-start/docker-compose.yml
docker compose up -d
```

Open `http://localhost:8003`. Project files persist in `./data/`.

Image:
[`ghcr.io/studiowebux/mdplanner`](https://github.com/studiowebux/mdplanner/pkgs/container/mdplanner)
— multi-platform (amd64, arm64), tagged per release and `latest`.

### From Source

Requires [Deno 2.x](https://deno.land/).

```bash
git clone https://github.com/studiowebux/mdplanner.git
cd mdplanner
deno task dev ./example
```

## Usage

```bash
mdplanner ./my-project
```

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

# Read-only mode (block all mutations)
mdplanner --read-only ./my-project

# Enable WebDAV to edit files with external editors (hx, nvim, Obsidian)
mdplanner --webdav ./my-project
mdplanner --webdav --webdav-user admin --webdav-pass secret ./my-project
```

Open `http://localhost:8003`. The project directory contains one `.md` file per
entity. Edit files directly, use the web UI, or mount via WebDAV — all three
work.

## Contributing

Fork, branch, PR. Follow the branch naming convention: `feat/`, `fix/`,
`refactor/`, `docs/`, `chore/`. Run checks before submitting:

```bash
deno fmt --check
deno lint
deno check main.ts
deno task test
```

## Documentation

https://mdplanner.dev

## License

[GPL-3.0](LICENSE)

## Contact

[Studio Webux](https://studiowebux.com)<br>
[Discord](https://discord.gg/BG5Erm9fNv)<br> tommy@studiowebux.com
