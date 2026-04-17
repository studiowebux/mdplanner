---
id: brainstorm_full
tags: [architecture, design, v2]
linked_projects: [mdplanner]
linked_tasks: [task_1774934556608_4lcq, task_1775088741078_ej4r]
linked_goals: [goal_v2]
created_by: person_1771824850093_s067dw
updated_by: person_1771824811363_phhxpx
created_at: 2026-04-01
updated_at: 2026-04-01
---

# V2 Architecture Deep Dive

## How should we handle the services.ts boilerplate?

Options considered:

- **Registry pattern**: Generic map with typed getters. Loses some type inference.
- **Self-registration**: Each domain exports init(). Clean but requires dynamic import order.
- **Code generation**: Generate services.ts from domain configs. Overkill for now.

Decision: Start with registry pattern, evaluate after 5 more domains.

## What's the right level of caching?

SQLite cache is read-through with full sync on startup. This works for <10k entities per domain. For larger datasets:

- Add incremental sync (check file mtime)
- Add write-through on create/update/delete
- Consider FTS rebuild optimization (currently full rebuild after sync)

## Should we extract the line item parser into a shared utility?

Yes — quote and invoice repos have identical line item parsing. Extract to `utils/line-item-parser.ts` with:

```
parseLineItems(rawItems: unknown[]): LineItem[]
```

Both repos import and use. Already created the shared `billing/constants.ts` for form fields — parser extraction is the data-layer equivalent.

## How do we handle v1→v2 migration for user data?

Standalone migration script (not in v2 codebase):

1. Read all v1 markdown files
2. Convert frontmatter keys to snake_case
3. Rename files to `{id}.md` format
4. Handle v1-specific fields (hourlyRate → rate, etc.)
5. Write to v2 directory structure

The v2 codebase stays clean — no v1 compat shims.
