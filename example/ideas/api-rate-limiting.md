---
id: idea_rate_limit
title: API Rate Limiting
status: considering
category: infrastructure
priority: high
project: API Gateway
startDate: "2026-04-01"
endDate: "2026-05-15"
resources: 1 dev, Redis instance
subtasks:
  - Design sliding window algorithm
  - Implement per-key and per-IP limits
  - Add rate limit headers to responses
  - Build admin override mechanism
created: 2026-03-20
links: [idea_integrations, idea_automation]
---

# API Rate Limiting

Protect the API Gateway from abuse and ensure fair usage across tenants.
Sliding window counter stored in Redis with configurable limits per API key.

## Requirements

- Default: 100 req/min per API key
- Burst: 20 req/sec max
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- 429 response with Retry-After header
