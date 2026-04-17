---
id: note_vendor_dependencies
created_at: "2026-01-05T11:00:00Z"
updated_at: "2026-03-15T09:00:00Z"
revision: 4
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Vendor Dependencies

## Vendored JS (v2/static/js/vendor/)
- htmx 2.0.8 — core hypermedia framework
- htmx SSE ext 2.2.4 — server-sent events support
- highlight.js 11.11.1 — code syntax highlighting (all languages)
- Scalar API reference 1.28.12 — OpenAPI UI

## Vendored CSS (v2/static/css/vendor/)
- highlight-github-11.11.1.min.css — light theme
- highlight-github-dark-scoped-11.11.1.css — dark theme (scoped with `.dark` prefix)

## NPM packages (via deno.json imports)
- hono — web framework + JSX runtime
- @hono/zod-openapi — OpenAPI spec generation
- zod — schema validation
