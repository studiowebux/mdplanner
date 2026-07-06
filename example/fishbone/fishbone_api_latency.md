---
id: fishbone_api_latency
title: API Latency Regression
description: p95 response time doubled after the gateway migration
project: API Gateway
created_at: 2026-05-05T00:00:00.000Z
updated_at: 2026-05-05T00:00:00.000Z
---

## People

- Limited load-testing ownership
- Knowledge silo on the caching layer

## Process

- No latency budget in the release checklist
- Missing canary deploy step

## Infrastructure

- Undersized connection pool
- Cross-region database calls

## Code

- N+1 queries in the list endpoints
- Synchronous calls that could be batched

## Data

- Missing index on a hot query path
- Stale cache causing fallthrough to origin

## Configuration

- Aggressive rate-limit retries amplifying load
- Default timeouts too high
