---
id: note_inventory_stock_sync
created_at: "2026-03-19T13:20:00Z"
updated_at: "2026-04-01T09:10:00Z"
revision: 1
mode: simple
project: Inventory System
tags: [mdplanner/notes]
---

# Stock Sync — How It Works

## Flow
The warehouse feed is polled every 15 minutes. Each row upserts a SKU by its
external id; missing SKUs are created, stale ones are flagged but never
deleted automatically.

## Edge cases
- Negative on-hand counts are clamped to zero and logged.
- Duplicate external ids: last write wins, with a warning.

## TODO
- [ ] Add a manual "force resync" action for a single SKU.
