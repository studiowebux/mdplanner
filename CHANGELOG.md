# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Backup system: `GET /api/backup/export` streams the project as a TAR archive;
  `POST /api/backup/import` extracts an archive into the project directory (pass
  `?overwrite=true` to clobber existing files)
- Backup encryption: start the server with `--backup-public-key <hex>` and all
  exports are encrypted with AES-256-GCM (key wrapped with RSA-OAEP-4096); no
  external dependencies — uses the built-in Web Crypto API (`crypto.subtle`)
- `mdplanner keygen` subcommand generates a hex-encoded RSA-OAEP-4096 key pair
  and prints both keys; the public key goes to `--backup-public-key`, the
  private key is used as the `X-Backup-Private-Key` header when importing an
  encrypted archive
- Automated backup scheduler: `--backup-dir <path>` combined with
  `--backup-interval <hours>` writes backup files to the given directory at the
  configured interval; env vars `MDPLANNER_BACKUP_DIR`,
  `MDPLANNER_BACKUP_INTERVAL`, `MDPLANNER_BACKUP_PUBLIC_KEY` are supported
- `POST /api/backup/trigger` writes an on-demand backup to `--backup-dir`
  (requires `--backup-dir` to be set)
- `GET /api/backup/status` returns last backup time, size, encryption flag,
  interval, and last error
- Backup panel in the Settings view: export button, import file picker with
  optional private key input, manual trigger button, and status summary
- `backup` feature toggle registered in feature visibility settings

## [0.6.0] - 2026-02-26

### Added

- WebDAV server: `--webdav` flag mounts the project directory at `/webdav` on
  the same port as the REST API; compatible with Obsidian, macOS Finder, and any
  RFC 4918 WebDAV client — edit markdown files directly without SSH
- `--webdav-user <user>` / `--webdav-pass <pass>`: optional Basic Auth for the
  WebDAV endpoint; unauthenticated when omitted
- WebDAV features: atomic writes, soft delete to `.trash/`, per-path write
  mutex, persistent lock store, dead property storage, range requests, ETags,
  RFC 4918 Class 1/2/3 compliance
- MCP HTTP transport: `/mcp` endpoint embedded in the existing Hono server (same
  port as REST API); connects any MCP client over the network without requiring
  SSH or a local process
- `--mcp-token <secret>` CLI flag: optional bearer token protection for the
  `/mcp` endpoint; when set, requests without a matching `Authorization: Bearer`
  header receive 401
- `deploy/mcp-claude-code.json`: Claude Code HTTP client config example
- Startup log now shows the MCP endpoint URL alongside the server URL
- Summary view: inline title and description editing without opening a modal
- Milestone field in task sidenav: datalist autocomplete from existing
  milestones plus milestones inferred from task frontmatter; auto-creates a
  milestone file when a new name is typed and the task is saved
- Portfolio search: real-time filter by name, category, client, and description
- docker-compose: commented examples for `--webdav`, `--cache`, and
  `--mcp-token` in both root and `deploy/` compose files

### Fixed

- Summary view crash: `renderProjectLinks` threw when a link entry was null or
  missing a `url` property; null links are now filtered in the parser, API
  route, and frontend
- Task sidenav not populating on open: all config fields (`due_date`,
  `priority`, `assignee`, `tags`, `milestone`, etc.) were read from `task.*`
  instead of `task.config.*` where the parser stores them
- Due date field empty when editing: `datetime-local` input requires
  `YYYY-MM-DDTHH:MM` format; stored dates with seconds or timezone suffix were
  silently rejected and the field showed blank
- Tags returning null on mobile: `getSelectedValues` now iterates `options`
  instead of `selectedOptions` which is unreliable on some mobile browsers
- Sidenav wider than viewport on mobile: `overflow-x: hidden` on
  `.sidenav-panel`
- Summary page horizontal overflow on mobile: `overflow-x: hidden` on
  `#summaryView`
- Touch scroll in list and board views triggering drag and drop: drag now
  requires a 400 ms long-press before activating; touchmove within the grace
  period scrolls normally
- File upload button unresponsive on mobile: hidden file input now uses
  position-based hiding instead of `display: none`, which blocked programmatic
  `click()` on iOS Safari
- `lastUpdated` in project.md not written on task mutations:
  `touchLastUpdated()` called from create, update, and delete routes
- Summary stats showing wrong section count: `updateStats()` now reads
  `tm.sections.length` instead of `projectConfig.sections` which does not exist
- Project start date set to today when not provided: removed today's date from
  the error-path default in `loadProjectConfig`; `saveProjectConfig` only writes
  `startDate` when the input is non-empty
- Portfolio project name truncated to one character on mobile: removed fixed
  width constraint on the name column
- Portfolio duration showing 0d when start equals end: `Math.max(1, diffDays)`
  ensures same-day projects show 1d
- Portfolio header overflow on desktop: `sidenav-title` gets
  `overflow: hidden; text-overflow: ellipsis` to prevent long names breaking the
  layout
- Global search button missing on mobile: `globalSearchBtnMobile` wired in
  `search.js`; `close()` null-deref on missing overlay element guarded
- C4 diagram context lost on page reload: `c4-sidenav` `close()` now flushes any
  pending auto-save before closing the panel
- Auto-save race condition: `BaseSidenavModule.save()` sets an `isSaving` flag
  to prevent concurrent writes; `close()` flushes rather than cancels a pending
  auto-save
- Ollama chat copy button broken on HTTP/LAN: `navigator.clipboard` is
  unavailable in non-secure contexts; fallback to `document.execCommand('copy')`
  via a temporary textarea

### Changed

- Mindmap toolbar buttons use `mousedown` + `preventDefault` to keep textarea
  focus and cursor position when clicking indent, unindent, add-child, etc.;
  previously clicking a button stole focus and reset the cursor to position 0
- Mindmap node spacing increased: `nodeSpacing` 20 → 40 px, `levelSpacing` 180 →
  220 px for less cramped layouts
- Mindmap zoom+pan desync fixed: `panEnd()` now writes back to `this.offset` so
  `updateZoom()` reads the post-pan position instead of the stale `{0, 0}`
  origin, preventing the viewport from snapping back when zooming after a pan

## [0.5.2] - 2026-02-23

### Added

- Portfolio: `urls` field — list of labelled links (Website, Repo, Demo, etc.)
  displayed as clickable links below the project name in list and tree views
- Portfolio: `logo` field — image URL or relative path displayed as a small
  thumbnail next to the project name
- Portfolio: `license` field — free-text license identifier (MIT, Apache-2.0,
  GPL-3.0, Proprietary, etc.) shown as a badge in the project row
- Portfolio: three new status values — `production`, `maintenance`, `cancelled`
  — with corresponding badge styles and filter buttons
- Portfolio detail panel: Links & Identity section with logo, license, and
  repeatable URL rows (label + href) with add/remove controls

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
