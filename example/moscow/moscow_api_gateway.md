---
id: moscow_api_gateway
title: Public API Gateway Scope
date: 2026-05-08
project: API Gateway
created_at: "2026-05-08T14:00:00.000Z"
updated_at: "2026-05-08T14:00:00.000Z"
---

# Public API Gateway Scope

Prioritization for the first public, versioned API release.

## Must Have

- API key authentication
- Versioned REST endpoints (v1)
- OpenAPI specification
- Per-plan rate limiting
- Structured error responses

## Should Have

- Webhook delivery with retries
- Developer portal with self-serve keys
- Request logging and usage metrics
- Pagination on all list endpoints

## Could Have

- GraphQL gateway
- SDKs for JavaScript and Python
- Sandbox environment

## Won't Have

- gRPC support
- Per-endpoint billing
- Public changelog API
