# v2 Pre-Merge Test Checklist

Manual validation before merging `feat/v0.39.0-view-partials` → `main`.

Run with: `deno task dev:v2 ./example`

**Legend:** ✅ Pass &nbsp; ❌ Fail &nbsp; ⚠️ Partial &nbsp; ⬜ Not tested

---

## Shell & Navigation

| # | Area | What to verify | Result | Notes |
|---|------|----------------|--------|-------|
| 1 | App shell | Page loads at `http://localhost:8003` | ⬜ | |
| 2 | Identity guard | Anonymous visit redirects to `/identity`, person selection sets cookie | ⬜ | |
| 3 | Sidebar | Nav links render, active link highlights, collapse/expand works | ⬜ | |
| 4 | Mobile sidebar | Menu button opens overlay, closes on outside click | ⬜ | |
| 5 | Theme toggle | Light → Dark → Yellow → Minimal cycles, persists on reload | ⬜ | |
| 6 | Font toggle | Mono font toggle in settings applies globally | ⬜ | |
| 7 | Search modal | Cmd+K opens, typing returns results, Esc closes | ⬜ | |
| 8 | Feature visibility | Hiding a feature in Settings removes it from nav | ⬜ | |
| 9 | SSE live refresh | Open two tabs — create a task in one, list updates in the other | ⬜ | |
| 10 | Motion toggle | Disabling motion removes CSS transitions and htmx swap delay | ⬜ | |

---

## Tasks

| # | Area | What to verify | Result | Notes |
|---|------|----------------|--------|-------|
| 11 | Task list | Renders all sections, filters by assignee/milestone/tag/section | ⬜ | |
| 12 | Task list — column toggle | Show/hide columns, persists in localStorage | ⬜ | |
| 13 | Task board | Kanban columns render with correct section counts | ⬜ | |
| 14 | Task timeline | Gantt bars render with correct date ranges | ⬜ | |
| 15 | Task create | Create via sidenav, appears in list without page reload | ⬜ | |
| 16 | Task detail | All fields display, inline edit works for title | ⬜ | |
| 17 | Task detail — comments | Add comment, renders below | ⬜ | |
| 18 | Task detail — assignee autocomplete | Typing filters people, selection saves | ⬜ | |
| 19 | Task move | Move task between sections from detail page | ⬜ | |
| 20 | Task delete | Delete from detail, redirects to list | ⬜ | |
| 21 | Task — GitHub link | GitHub tab on task detail shows linked PR/issue | ⬜ | |

---

## Planning

| # | Area | What to verify | Result | Notes |
|---|------|----------------|--------|-------|
| 22 | Goals | List, create, detail, delete | ⬜ | |
| 23 | Milestones | List, create, detail with task count progress | ⬜ | |
| 24 | Ideas | List, create, detail, delete | ⬜ | |
| 25 | Brainstorms | List, create session, add answers, detail | ⬜ | |
| 26 | Brainstorm templates | Create template, use in new session | ⬜ | |
| 27 | Reflections | List, create from template, detail | ⬜ | |
| 28 | Reflection templates | Create, edit, delete | ⬜ | |
| 29 | Retrospectives | List, create, detail | ⬜ | |
| 30 | MoSCoW | List, create, quadrant view renders | ⬜ | |
| 31 | Eisenhower | List, create, quadrant view renders | ⬜ | |
| 32 | Idea Sorter | Sorting interaction works, ranking saves | ⬜ | |

---

## Strategy

| # | Area | What to verify | Result | Notes |
|---|------|----------------|--------|-------|
| 33 | SWOT | List, create, quadrant view renders all four sections | ⬜ | |
| 34 | Risk Analysis | List, create, matrix view plots impact vs probability | ⬜ | |
| 35 | Lean Canvas | List, create, canvas view renders 9 blocks | ⬜ | |
| 36 | Business Model | List, create, canvas view renders 9 components | ⬜ | |
| 37 | Project Value Board | List, create, detail | ⬜ | |
| 38 | Brief | List, create, detail with RACI section | ⬜ | |
| 39 | Marketing Plans | List, create, detail with channels and linked goals | ⬜ | |
| 40 | Strategic Levels | List, create, hierarchy view renders | ⬜ | |
| 41 | Fishbone | List, create, cause-effect diagram renders | ⬜ | |

---

## Finances

| # | Area | What to verify | Result | Notes |
|---|------|----------------|--------|-------|
| 42 | Fundraising / Investors | List, create investor, SAFE detail | ⬜ | |
| 43 | Billing — Invoices | List, create invoice, print view renders | ⬜ | |
| 44 | Billing — Quotes | List, create quote, detail | ⬜ | |
| 45 | Billing — Customers | List, create customer, detail | ⬜ | |
| 46 | Billing — Payments | List payments, mark paid | ⬜ | |
| 47 | Billing — Rates | List rates, create, detail | ⬜ | |
| 48 | Finances | List entries, create revenue/expense, period filter | ⬜ | |

---

## Diagrams

| # | Area | What to verify | Result | Notes |
|---|------|----------------|--------|-------|
| 49 | Canvas (sticky notes) | Board renders, create/move sticky note | ⬜ | |
| 50 | Mindmap | Create mindmap, add nodes, canvas renders without text overlap | ⬜ | |
| 51 | C4 Architecture | Create component at each level, connections render | ⬜ | |

---

## Team

| # | Area | What to verify | Result | Notes |
|---|------|----------------|--------|-------|
| 52 | People | List, create person, detail | ⬜ | |
| 53 | Org Chart | Tree renders from people hierarchy, drag-drop, zoom/pan | ⬜ | |
| 54 | Capacity | Plan view renders per-person weekly allocation | ⬜ | |
| 55 | Time Tracking | Log entry, project-based summary | ⬜ | |
| 56 | CRM — Companies | List, create, detail | ⬜ | |
| 57 | CRM — Contacts | List, create, linked to company | ⬜ | |
| 58 | CRM — Deals | List, create, detail with stage | ⬜ | |
| 59 | Onboarding | Create checklist, complete items | ⬜ | |
| 60 | Onboarding templates | Create, use to generate checklist | ⬜ | |

---

## Notes

| # | Area | What to verify | Result | Notes |
|---|------|----------------|--------|-------|
| 61 | Notes | List, create simple note, detail renders markdown | ⬜ | |
| 62 | Notes — enhanced editor | Section blocks render (tabs, timeline, split-view) | ⬜ | |
| 63 | Notes — code blocks | Syntax highlighting renders, copy button works | ⬜ | |
| 64 | Notes — inline edit | Title and project edit in place without page wipe | ⬜ | |
| 65 | Meetings | List, create, detail with attendees and action items | ⬜ | |
| 66 | Journal | List entries, create entry, mood tracking | ⬜ | |
| 67 | Habits | List habits, mark complete, monthly view | ⬜ | |
| 68 | KPIs | List, create KPI, progress bar renders | ⬜ | |

---

## Portfolio & Tools

| # | Area | What to verify | Result | Notes |
|---|------|----------------|--------|-------|
| 69 | Portfolio | List, create item, detail with GitHub repo linked | ⬜ | |
| 70 | Portfolio dashboard | Summary view renders status, timeline, KPIs | ⬜ | |
| 71 | Analytics | Dashboard renders task completion and goal charts | ⬜ | |
| 72 | Uploads | Upload a file, list appears, download works | ⬜ | |
| 73 | Backup — export | Download backup JSON from Settings → Data | ⬜ | |
| 74 | Backup — import | Import backup JSON, per-domain counts shown | ⬜ | |
| 75 | AI Chat | Connect Ollama, send a message, response streams | ⬜ | |
| 76 | Me / preferences | View preferences page, change defaults, persists | ⬜ | |

---

## Infrastructure & Integrations

| # | Area | What to verify | Result | Notes |
|---|------|----------------|--------|-------|
| 77 | DNS Tracker | List domains, create entry, Cloudflare sync (if token set) | ⬜ | |
| 78 | GitHub — view | Portfolio items with repos render open issues/PRs inline | ⬜ | |
| 79 | GitHub — merge PR | Merge button triggers merge, status updates | ⬜ | |
| 80 | GitHub — pipelines | Workflow runs list with status/branch filter | ⬜ | |
| 81 | MCP server | Connect Claude Desktop, `list_tasks` returns data | ⬜ | |
| 82 | MCP token | Set `MCP_TOKEN`, unauthenticated request returns 401 | ⬜ | |
| 83 | Secret key encryption | Set `MDPLANNER_SECRET_KEY`, save Cloudflare token, check `project.md` shows ciphertext | ⬜ | |
| 84 | Full-text search | `CACHE=true`, search modal returns snippets with highlights | ⬜ | |

---

## Deployment

| # | Area | What to verify | Result | Notes |
|---|------|----------------|--------|-------|
| 85 | Docker | `docker compose -f deploy/docker-compose.yml up -d`, opens on 8080 | ⬜ | |
| 86 | Health endpoint | `GET /api/health` returns 200 with version and uptime | ⬜ | |
| 87 | CSP | No CSP violations in browser console on any page | ⬜ | |
| 88 | No inline styles | Browser inspector shows no `style=` attributes (except sidenav resize and timeline positioning) | ⬜ | |

---

## Known Issues / Won't Fix Before Merge

| Issue | Detail |
|-------|--------|
| WebDAV | Not ported to v2 — documented as planned |
| Rate limiting | v1-only, not in v2 |
| Read-only mode | v1-only, not in v2 |
| API token auth | Identity guard replaces this; cookie-based REST auth not yet in v2 |
| Screenshots / videos | Coming after merge |
