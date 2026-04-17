---
id: brief_v2
title: v2.0 Architecture Rewrite Brief
date: 2026-03-01
createdAt: "2026-03-01T09:00:00.000Z"
updatedAt: "2026-03-28T14:22:00.000Z"
---

# v2.0 Architecture Rewrite Brief

## Summary

Rewrite the MDPlanner backend from a monolithic v1 parser to a clean v2
architecture with domain-owned repositories, Hono JSX SSR, and a single SSE
bus. Target: fully replace v1 src/ by end of Q2 2026.

## Mission

Ship a maintainable, extensible v2 that supports 40+ domain views, an OpenAPI
spec, and a first-class MCP server — without breaking existing data on disk.

## Responsible (R)

- Engineering lead: overall implementation
- Frontend: SSR views, CSS, htmx interactions
- Backend: repositories, services, API routes

## Accountable (A)

- Product owner: milestone sign-off and scope decisions

## Consulted (C)

- Users: feedback on UX changes during beta
- DevOps: deployment and Docker Compose configuration

## Informed (I)

- Stakeholders: monthly progress updates
- Future contributors: via docs/ and architecture notes

## High-Level Budget

- Engineering time: ~200 hours across Q1–Q2 2026
- Infrastructure: no change (self-hosted)
- Tooling: Deno, Hono, SQLite — all zero cost

## High-Level Timeline

- Jan–Feb 2026: Core shell, task/milestone/note domains
- Mar 2026: Billing, CRM, goals, ideas, brainstorm, brief
- Apr 2026: Retrospectives, meetings, mindmaps, remaining domains
- May 2026: MCP v2, search, polish
- Jun 2026: v2.0.0 tag, deprecate v1

## Culture

- Clean architecture over feature velocity
- Every domain follows the same factory pattern
- No inline styles — CSS vars only
- Tests before tagging

## Change Capacity

Architecture changes require owner approval. New domains can be added
in parallel without coordination conflicts.

## Guiding Principles

- Domain isolation: each domain owns its types, repo, service, and view
- Zero v1 dependencies in v2 code
- Markdown files as the single source of truth
- Progressive enhancement — works without JavaScript
