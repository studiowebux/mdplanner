---
id: note_enhanced_demo
created: "2026-02-22T10:00:00Z"
updated: "2026-02-22T10:00:00Z"
revision: 1
mode: enhanced
---

# Enhanced Note — Component Demo

This note demonstrates every enhanced note component: text paragraphs,
code blocks, tabs, timeline, and split-view sections.

Each component can contain nested text and code blocks.

```typescript
// Top-level code paragraph
function greet(name: string): string {
  return `Hello, ${name}`;
}
```

<!-- Custom Section: Tech Stack -->
<!-- section-id: section_stack, type: tabs -->

### Tab: Frontend
<!-- tab-id: tab_frontend -->

The frontend is built with Deno and vanilla JavaScript. No frameworks,
no build tools — just ES modules.

```typescript
import { render } from "./render.ts";

render({ target: "#app", data: await fetch("/api/tasks").then(r => r.json()) });
```

### Tab: Backend
<!-- tab-id: tab_backend -->

The backend is a Hono API running on Deno. All routes are typed with
Zod schemas at the handler boundary.

```typescript
app.get("/api/tasks", async (c) => {
  const tasks = await TasksAPI.fetchAll();
  return c.json(tasks, 200);
});
```

### Tab: Infrastructure
<!-- tab-id: tab_infra -->

Deployment uses a single Linux binary compiled with `deno compile`.
A systemd service manages the process lifecycle.

```bash
deno compile --allow-net --allow-read --allow-write \
  --output dist/mdplanner main.ts
```

### Tab: Database
<!-- tab-id: tab_database -->

Markdown files are the source of truth. SQLite is an optional read
cache rebuilt on startup. No migrations, no schema drift.

<!-- End Custom Section -->

<!-- Custom Section: Release Timeline -->
<!-- section-id: section_timeline, type: timeline -->

## v0.1.0 — Initial release (success)
<!-- item-id: item_v010, status: success, date: 2026-01-15 -->

First public release. Core parser, API layer, and task board view.

```bash
git tag v0.1.0 && git push --tags
```

## v0.2.0 — Notes and goals (success)
<!-- item-id: item_v020, status: success, date: 2026-02-01 -->

Added enhanced notes, goal tracking, and org chart.

## v0.3.0 — Business tools (success)
<!-- item-id: item_v030, status: success, date: 2026-02-15 -->

MoSCoW, Eisenhower, SAFE, CRM, billing, and fundraising views.

## v0.4.0 — Mobile polish (pending)
<!-- item-id: item_v040, status: pending, date: 2026-03-01 -->

Responsive design pass, mobile overflow fixes, enhanced note mobile
layout improvements.

## v1.0.0 — Stable release (pending)
<!-- item-id: item_v100, status: pending, date: 2026-06-01 -->

Full feature parity, docs, binary distribution for all platforms.

<!-- End Custom Section -->

<!-- Custom Section: Architecture Decision -->
<!-- section-id: section_arch, type: split-view -->

### Column 1

**Option A — Monolith**

Keep everything in a single binary. Simple deployment. No service
mesh. No network latency between components.

Pros: easy to operate, single process, fast local reads.

```bash
./mdplanner ./my-project --port 8003
```

### Column 2

**Option B — Microservices**

Split parser, cache, and API into separate processes. Enables
independent scaling and language diversity.

Cons: adds operational complexity, network hops, service discovery.

```yaml
services:
  parser: { image: mdplanner-parser }
  api:    { image: mdplanner-api }
  cache:  { image: mdplanner-cache }
```

<!-- End Custom Section -->
