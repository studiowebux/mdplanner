# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.1] - 2026-02-23

### Fixed

- Portfolio create: `create()` delegated to `update()` which reads the file
  first — file doesn't exist on create so read returned null, nothing was
  written, panel closed silently discarding all inputs
- Docker: `init` subcommand now reaches `main.ts` correctly; previous CMD-only
  setup caused `docker run ... init /data` to invoke `deno init` (Deno's own
  scaffold) instead of `deno run main.ts init /data`

## [0.5.0] - 2026-02-23

### Added

- AI Chat view: integrated ollamaui as an isolated, self-contained chat module
  with streaming, model selection, image support, and config panel; scoped CSS
  under `.ollama-view-root` using mdplanner theme variables
- TTS proxy: `POST /api/tts/synthesize` and `POST /api/tts/voices` server-side
  proxy to Chatterbox to avoid duplicate CORS headers
- Full AI stack in `deploy/`: docker-compose with Caddy, Ollama, Chatterbox TTS,
  and SearXNG; Caddy routes `/tts/*` and `/search*` to respective services
- MCP server (`mcp.ts`): exposes mdplanner data as Model Context Protocol tools
  and resources; compatible with Claude Desktop via stdio transport
- AI Chat registered in feature visibility toggle under Tools group

### Fixed

- Search modal: stale CSS variable references (`--bg`, `--border`, `--text`,
  `--surface`, `--radius`) replaced with current `--color-*` / `--radius-md`
  names; modal was fully transparent with no borders

## [0.4.0] - 2026-02-22

### Added

- Promote meeting action items to tasks: "Promote to task" button on open action
  items in the Actions tab and meeting read-only modal; creates a Backlog task
  preserving assignee and due date, with a note linking back to the source
  meeting

### Changed

- Unified tab navigation component across all views: canonical `.view-tabs` /
  `.view-tab` / `.view-tab.active` in `components.css`; migrated Finances,
  Meetings, Fundraising, Capacity, Onboarding, Billing, CRM

### Fixed

- Upload orphan detection now correctly computes relative paths using
  `@std/path/relative`, resolving false positives when the project directory is
  passed as a relative path (e.g. `./example`)

## [0.3.8] - 2026-02-22

### Added

- Startup financial dashboard: three-tab view with Overview (period table), Burn
  Rate (runway cards + CSS bar chart), and P&L (category pivot table)
- Financial periods stored in `finances/` directory as one `.md` file per month
  with revenue and expense line items in YAML frontmatter
- Derived metrics computed in browser: net, burn rate, runway months
- API routes: `GET/POST /api/finances`, `GET/PUT/DELETE /api/finances/:id`
- Sidenav: create/edit periods with dynamic add/remove revenue and expense line
  items, cash on hand, and notes
- Registered in feature visibility toggle under Finances group

## [0.3.7] - 2026-02-22

### Added

- Employee onboarding flow: records view with checklist detail panel, templates
  for reusable step sets, progress tracking per employee
- Onboarding records stored in `onboarding/` directory as one `.md` file per
  employee with YAML frontmatter for steps and metadata
- Onboarding templates stored in `onboarding-templates/` directory
- API routes: `GET/POST /api/onboarding`, `GET/PUT/DELETE /api/onboarding/:id`,
  full CRUD for `/api/onboarding-templates`

### Fixed

- Onboarding API PUT route now performs safe partial update: only merges fields
  explicitly present in the request body, preventing undefined values from
  wiping existing frontmatter fields (employeeName, role, startDate)

## [0.3.6] - 2026-02-22

### Added

- Meetings view: meeting list with create/edit sidenav, action items per meeting
  (description, owner, due date, status), actions sub-view with flat list of all
  open action items filterable by owner and due date
- Meetings stored in `meetings/` directory as one `.md` file per meeting with
  YAML frontmatter for attendees and action items, markdown body for notes
- API routes: `GET/POST /api/meetings`, `GET/PUT/DELETE /api/meetings/:id`

### Fixed

- Meetings feature visibility: registered `meetings` under the "Team" group in
  the settings toggle so it can be enabled or disabled per project
- Meetings nav button now correctly resets its active state when switching views

## [0.3.5] - 2026-02-22

### Fixed

- Mobile overflow: all 25 view header rows now wrap action buttons to a second
  line below 36rem via shared `view-header` CSS class
- Mobile overflow: capacity planning header, tab bar, import row, and
  allocations sub-header all wrap correctly on small screens
- Mobile overflow: brief view RACI grid collapses from 4 → 2 → 1 columns;
  budget/timeline and culture grids collapse from 2 → 1 column
- Mobile overflow: portfolio project name no longer truncates; progress and
  financials columns hidden on narrow screens to give name room
- Mobile overlay: org chart canvas view disabled below 767px with a "requires
  larger screen" notice; card view available on desktop only
- Mobile overlay: C4, canvas, mindmap, timeline, and strategic levels views
  already had mobile notices; org chart notice added for consistency
- Enhanced note editor: paragraph controls toolbar switches from
  `position: absolute` to `position: static` on mobile so Language selector,
  Copy, and Delete buttons flow inside the card instead of overflowing it
- Enhanced note editor: custom section tab nav now scrolls horizontally in both
  editor and preview modes instead of causing page-level overflow
- Enhanced note editor: note title input given `min-width: 0` so it shrinks
  correctly in its flex row on narrow screens
- Enhanced note editor: title/actions row and add-block toolbar wrap to a second
  line below 640px
- Org chart example: all members now have valid `reportsTo` references,
  resulting in a fully connected tree with no floating nodes

### Added

- Example enhanced note (`enhanced-components-demo.md`) covering all component
  types: text paragraphs, code blocks, tabs with nested content, timeline with
  five milestones, and split-view with two columns

## [0.3.4] - 2026-02-22

### Added

- Fundraising view with four tabs: SAFE Rounds, Investor Pipeline, KPI Tracker,
  Runway Calculator
- SAFE agreements: cap table with computed ownership percentages
- Investor pipeline: filterable table by status (not started, in progress, term
  sheet, invested, passed)
- KPI Tracker: MRR, ARR, churn rate, LTV, CAC, LTV/CAC ratio, growth rate,
  active users — per period snapshots
- Runway Calculator: cash on hand + monthly burn → months remaining and
  projected runway-out date, persisted to localStorage
- Three new markdown section directories: `safe/`, `investors/`, `kpis/`
- Acronym glossary popover (SAFE, MFN, MRR, ARR, LTV, CAC, LTV/CAC, MoM, KPI)
- Font size variable scale in CSS design system: `--font-size-xs` (10px),
  `--font-size-sm` (12px), `--font-size-base` (14px), `--font-size-lg` (16px),
  `--font-size-xl` (20px), `--font-size-xxl` (24px)

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
