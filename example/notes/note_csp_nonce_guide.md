---
id: note_csp_nonce_guide
created_at: "2026-02-05T14:00:00Z"
updated_at: "2026-03-15T16:00:00Z"
revision: 4
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# CSP Nonce Guide

## How it works
Nonce generated per request in middleware. Injected into `<script>` and `<style>` tags.
htmx needs `inlineStyleNonce` in meta config for its internal `<style>` tag.

## img-src policy
`img-src 'self' https: data:` — allows external images in markdown content.

## Timeline gotcha
Nonce'd `<style>` tags FAIL on htmx fragment swaps.
New nonce ≠ original page CSP nonce → blocked.
Solution: use data attrs + `element.style.setProperty()` (CSSOM, not blocked).

## KPI gauges
`data-pct` attr + kpi-gauge.js (CSSOM) — never inline `style="width:"`.
