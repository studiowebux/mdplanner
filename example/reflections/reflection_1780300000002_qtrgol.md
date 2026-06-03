---
id: reflection_1780300000002_qtrgol
title: Q1 2026 goals review
period: quarterly
date: 2026-03-31
template_id: rtemplate_quarterly_goals
tags: [mdplanner/reflections]
created_at: "2026-03-31T17:00:00.000Z"
updated_at: "2026-03-31T17:00:00.000Z"
---

## Which goals did I fully achieve this quarter, and what made that possible?

The v2 rewrite reached feature parity with v1, and the SSE-driven live views
shipped. Freezing v1 entirely and committing to the domain-view factory
pattern — instead of porting screen by screen — is what made it possible.

## Which goals did I miss, and what was the root cause?

Multi-user / teams support. The root cause is that the data model assumes a
single owner; I underestimated how much user-scoping the repositories and
views would need.

## What surprised me most — positively or negatively — this quarter?

Positively: how much the shared component catalog accelerated each new
domain. By the tenth domain, a full CRUD view was a day's work.

## What assumptions proved wrong, and what does that change?

I assumed htmx could not handle drag-and-drop or canvas interactions. Half
right — canvas still needs JS, but SortableJS plus `htmx.onLoad` covers list
reordering cleanly. That keeps most mutations declarative.

## What should I stop doing entirely next quarter?

Hand-rolling per-domain detail-page chrome. Every bespoke top-bar drifts from
the canonical components and creates exactly the consistency bugs I keep
fixing.

## What new goal or priority has emerged that I did not anticipate?

Data-integrity tooling. Once example data drifted during migration, an
automated ref-checking scan went from "nice to have" to essential.

## What is the single most important outcome I want from next quarter?

A public v2 GA backed by demo-quality example data in every module.
