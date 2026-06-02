---
title: Migrating v1 → v2
---

# Migrating v1 → v2

v2 stores each entity as a markdown file with **snake_case frontmatter**, a
stable `id`, audit timestamps, and a `{id}.md` filename. Projects created on
v1 (≤ 0.38.x) often differ: camelCase keys, missing ids, slug filenames,
duplicate files, and a few different directory names. The migration script
normalizes a v1 project so v2 reads it.

> **Back up first.** The migration rewrites and renames files in place. Copy
> your project directory before running it on real data.

## What the script does

`scripts/migrate-v1-to-v2.ts` is a **mechanical normalizer**. Per `.md` file it:

1. Backfills a missing `id` (derived from the filename + directory prefix).
2. Converts camelCase frontmatter keys → snake_case (recursive: nested objects + arrays).
3. Adds `created_at` / `updated_at` when missing (falls back to file mtime).
4. Removes duplicate files (same `id`, different filenames).
5. Renames each file to `{id}.md`.

It is **idempotent** — running it twice is safe; the second run reports 0 changes.

## Run it

```bash
# Dry run first — reports what would change, writes nothing
deno task migrate --dry-run ./my-project

# Apply
deno task migrate ./my-project
```

`projectDir` defaults to `./example` when omitted.

### In Docker

The script ships inside the image. Run it against the mounted data volume with
the server **stopped**, then start (or restart) so the SQLite cache reseeds —
the migration changes files on disk directly and the cache only re-reads on
boot:

```bash
docker compose -f deploy/docker-compose.yml run --rm mdplanner \
  deno task migrate /data
docker compose -f deploy/docker-compose.yml up -d
# or, if already running:
docker compose -f deploy/docker-compose.yml restart mdplanner
```

## Verify with the loss audit

`scripts/audit-v1-v2-loss.ts` uses v2's own repositories as the oracle. It loads
every entity through v2, then walks every file and reports:

- **Dropped keys** — frontmatter keys v2 does not carry on the parsed entity.
- **Unmatched files** — files whose `id` no v2 service returns (an unhandled
  directory, a parse failure, or a non-entity file like `project.md`).

```bash
deno run --allow-read --allow-write --allow-env \
  scripts/audit-v1-v2-loss.ts ./my-project
```

Run it after migrating. A clean report (no dropped keys, only expected
unmatched files such as `project.md`) means v2 reads everything.

> **Limitation:** the audit detects *dropped keys*, not value-level mis-reads.
> If v2 parses a v1 *value* differently (an enum or date format), the key
> survives and the audit will not flag it. Certifying zero-loss still needs a
> value diff against a copy of the real data.

## Known gaps — NOT handled automatically

The script normalizes frontmatter and filenames only. The following real v1→v2
differences are **not** applied automatically and must be handled manually when
migrating a real v1-only project (the audit's "unmatched files" / "dropped
keys" will surface them):

| v1 | v2 | Action needed |
| --- | --- | --- |
| `crm/contacts/` | `contacts/` | move directory |
| `crm/companies/` | `companies/` | move directory |
| `crm/deals/` | `deals/` | move directory |
| `capacity/` | `capacity-plans/` | move directory |
| `canvas/` | `sticky-notes/<board>/` | move + adopt board structure |
| `crm/interactions/` | — | no v2 equivalent (dropped) |
| `kpis/` | merged into `goals/` | re-model as goal KPI fields |
| `timetracking/` | merged into `tasks/` | re-model as `task.time_entries` |
| `people.department` (string) | `people.departments` (array) | field rename + wrap in array |
| `note.tags`, `note.mode` (root) | — | tags moved to paragraphs; `mode` removed |

Directories that **stay nested** in v2 (no change): `billing/customers`,
`billing/invoices`, `billing/quotes`, `billing/rates`, `billing/payments`.

After moving directories, re-run the audit until the only remaining unmatched
files are intentional (e.g. `project.md`).
