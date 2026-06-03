---
id: reflection_1780300000003_postmt
title: v1 → v2 migration postmortem
period: monthly
date: 2026-05-28
template_id: rtemplate_project_postmortem
tags: [mdplanner/reflections]
created_at: "2026-05-28T20:00:00.000Z"
updated_at: "2026-05-28T20:00:00.000Z"
---

## Did we deliver what we promised, on time and to the expected quality?

Mostly. Feature parity landed close to schedule, but a few domains lost data
silently during a v1-only cutover — caught later by the audit script rather
than at migration time.

## What were the top three things that went well, and why?

The domain-view factory, the single shared SSE bus, and the soft-delete /
archive pattern all generalized cleanly. Each was designed once and reused
across every domain.

## What were the top three things that went poorly, and what was the root cause?

The migration script only normalized frontmatter — it never relocated legacy
directories or transformed renamed fields, and it left reference IDs
pointing at the old names. Root cause: we wrote the migration as a formatter,
not as a data transform.

## Were requirements clear from the start? Where did scope creep or ambiguity cause problems?

"Clean architecture" was under-specified. The milestone implementation
pattern only crystallized mid-project, so the earliest domains had to be
revisited to match it.

## How was team communication and collaboration throughout the project?

Async via brain notes worked well for a small team. Keeping decisions
append-only meant we could trace why a choice was made months later without
guessing.

## What would we do differently if we restarted this project today?

Write the audit and verification script first, and gate the cutover on it
passing. We would have seen the silent data loss before deleting v1.

## What processes or tools should we adopt, drop, or change based on this project?

Adopt: the integrity scan in CI. Drop: silent migrations with no verification
step. Change: enforce the version-bump-before-tag discipline so releases stop
drifting from the declared version.

## What should the next team know before starting a similar project?

The brain is the source of truth. Read the Brain Memory section of
`local-dev.md` before touching a domain — most of the non-obvious gotchas are
already written down there.
