---
id: note_architecture
created_at: "2026-01-05T10:00:00Z"
updated_at: "2026-03-22T00:41:35.820Z"
revision: 13
mode: enhanced
project: Client Portal
---

# Architecture Overview

## Key Decisions

1. **Monorepo Structure**: Using Turborepo for managing frontend and backend in
   single repo
2. **API Design**: REST with OpenAPI spec, considering GraphQL for v2
3. **Auth**: JWT with refresh tokens, Auth0 as identity provider
4. **Real-time**: WebSocket connections for live collaboration

## Database Schema

Primary entities: Users, Workspaces, Projects, Tasks, Comments, TimeEntries

See C4 diagrams for detailed architecture views.

<!-- Custom Section: Tech Stack -->
<!-- section-id: section_stack, type: tabs -->

### Tab: Frontend
<!-- tab-id: tab_frontend -->

- React 18 with TypeScript
- TailwindCSS for styling
- Zustand for state management
- React Query for server state

### Tab: Backend
<!-- tab-id: tab_backend -->

- Deno with Hono framework
- PostgreSQL database
- Redis for caching
- S3 for file storage

### Tab: Infrastructure
<!-- tab-id: tab_infra -->

- AWS ECS for containers
- CloudFront CDN
- Route53 DNS
- Terraform for IaC

### Tab: Database
<!-- tab-id: tab_database -->

Primary storage: PostgreSQL with connection pooling.
Cache layer: Redis with 15-minute TTL.
File storage: S3 with presigned URLs.

<!-- End Custom Section -->