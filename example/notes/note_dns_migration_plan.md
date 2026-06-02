---
id: note_dns_migration_plan
created_at: "2026-02-20T11:00:00Z"
updated_at: "2026-03-10T14:00:00Z"
revision: 3
mode: simple
project: Infrastructure
tags: [mdplanner/notes]
---

# DNS Migration Plan

## Goal
Move all domains from old registrar to Cloudflare for:
- Faster DNS propagation
- Built-in DDoS protection
- API-driven DNS management (via MDPlanner DNS module)

## Domains to migrate
- mdplanner.dev ✅
- cerveau.dev ✅
- studiowebux.com 🔄 in progress

## Steps per domain
1. Export zone file from current registrar
2. Import into Cloudflare (auto-import works)
3. Update nameservers at registrar
4. Wait for propagation (24-48h)
5. Verify all records resolve

## Rollback
Nameserver change is reversible — switch back within 48h if issues.
