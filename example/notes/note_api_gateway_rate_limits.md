---
id: note_api_gateway_rate_limits
created_at: "2026-04-01T10:00:00Z"
updated_at: "2026-04-20T12:00:00Z"
revision: 2
mode: simple
project: API Gateway
tags: [mdplanner/notes]
---

# API Gateway — Rate Limits

## Defaults
- Anonymous: 60 requests/min per IP.
- Authenticated: 600 requests/min per key.
- Burst: token bucket, 2x sustained rate for 10s.

## Responses
Over-limit returns `429` with a `Retry-After` header. Clients should back
off using the header value, not a fixed delay.

## Notes
Per-route overrides live in config. The search endpoint has a tighter limit
because it is the most expensive call.
