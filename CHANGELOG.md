# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.3] - 2026-02-22

### Added

- Desktop and touch drag-drop for list view (was wired `draggable=true` but had
  zero event handlers)
- Mobile-unsupported notice for Canvas, Mindmap, Timeline at < 768px — hides
  broken layout, shows a message instead
- Mobile support reference table in `docs/user-guide.md`
- Dockerfile and docker-compose for containerized deployment with data volume
- Health check on container startup (`wget` against `127.0.0.1`)
- `deploy/Makefile` with `install`, `uninstall`, `start`, `stop`, `restart`,
  `status`, `logs` targets for systemd-managed installs
- Rewrote `docs/user-guide.md` for current directory-based storage format
- Updated `README.md` to include Docker quickstart, full structure per project
  conventions, and all contact/funding links

### Fixed

- `.w-80` and `.min-h-48` utility classes missing after Tailwind removal — board
  kanban columns had no width so horizontal scroll was non-functional
- `dragover` in list view only called `preventDefault` on explicit drop zones;
  dragging over task items showed no-drop cursor and drop never fired
- Docker healthcheck used `localhost` which fails in Alpine; switched to
  `127.0.0.1`

## [0.3.2] - 2026-02-22

### Added

- Idea sorter table view: sortable/filterable table over the existing ideas
  directory
- Extended `Idea` type with `priority`, `startDate`, `endDate`, `resources`, and
  `subtasks` fields
- Inline subtask management in idea sidenav (add/remove without save)

### Fixed

- `btn-primary` hover uses `filter: brightness(0.85)` — no cascade or theme
  issues
- `btn-secondary` hover uses inverse colors (`--color-bg-inverse` /
  `--color-text-inverse`) for guaranteed contrast in all themes and dark mode

## [0.3.1] - 2026-02-21

### Added

- Eisenhower matrix prioritization view (2×2 grid: Urgent/Important quadrants)
- MoSCoW prioritization view (Must, Should, Could, Won't columns)
- Org chart department autocomplete with chip-style multi-select input

### Fixed

- Various dark mode and UI polish fixes across views

## [0.3.0] - 2026-02-21

### Added

- Unified people registry: single `people/` directory replaces fragmented org
  chart members, capacity team members, and portfolio team strings
- Feature visibility toggle: enable/disable views from project settings
  (`project.md` frontmatter)
- Responsive design pass with touch support across all views
- UI polish: notes markdown rendering, sidenav consistency, modal improvements
- `init` CLI subcommand to scaffold a new project directory
- Linux systemd service file and deployment documentation
- Portfolio: create and delete project
- People registry frontend view with full CRUD

### Fixed

- Org chart dark mode text rendering and sidenav close-on-save
- Removed all Tailwind CSS utility classes; replaced with semantic CSS utility
  classes and `--color-*` variable system

## [0.2.1] - 2026-01-xx

### Fixed

- Minor bug fixes and stability improvements

## [0.2.0] - 2026-01-xx

### Added

- Initial public release
- Task, note, goal, milestone, canvas, mindmap, C4 architecture, SWOT, risk,
  lean canvas, business model, retrospective, ideas, strategic levels, billing,
  CRM, capacity, time tracking, portfolio, org chart views
- Directory-based markdown parser with YAML frontmatter
- Hono REST API
- SQLite cache layer (optional, `--cache` flag)
- Single binary distribution via `deno compile` for Linux, macOS (Intel/ARM),
  Windows
- GitHub Actions CI/CD pipeline

[Unreleased]: https://github.com/studiowebux/mdplanner/compare/v0.3.3...HEAD
[0.3.3]: https://github.com/studiowebux/mdplanner/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/studiowebux/mdplanner/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/studiowebux/mdplanner/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/studiowebux/mdplanner/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/studiowebux/mdplanner/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/studiowebux/mdplanner/releases/tag/v0.2.0
