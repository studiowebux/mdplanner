---
id: note_security_checklist
created_at: "2026-02-05T09:00:00Z"
updated_at: "2026-03-15T14:00:00Z"
revision: 2
mode: simple
project: MDPlanner
tags: [mdplanner/notes]
---

# Security Checklist

## Input validation
- [ ] All API inputs validated with Zod schemas
- [ ] File paths sanitized (no `../` traversal)
- [ ] No SQL injection (parameterized queries via SQLite driver)

## CSP
- [x] Nonce per request for scripts and styles
- [x] `img-src 'self' https: data:`
- [ ] Report-only mode for testing new policies

## Secrets
- [ ] No secrets in git history
- [x] `AES-256-GCM` for stored tokens (`secrets.ts`)
- [ ] Rotate `MDPLANNER_SECRET_KEY` quarterly

## Dependencies
- [ ] Audit vendored JS for known CVEs
- [ ] Pin exact versions in `deno.lock`
