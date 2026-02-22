---
id: note_architecture
created: "2026-01-05T10:00:00Z"
updated: "2026-02-22T18:22:16.528Z"
revision: 9
mode: enhanced
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

```javascript
Hello
```

<!-- Custom Section: Tech Stack -->
<!-- section-id: section_stack, type: tabs -->

### Tab: Frontend
<!-- tab-id: tab_1771784034588_a3a0 -->

<!-- tab-id: tab_frontend -->

- React 18 with TypeScript
- TailwindCSS for styling
- Zustand for state management
- React Query for server state

### Tab: Backend
<!-- tab-id: tab_1771784034588_74xf -->

<!-- tab-id: tab_backend -->

- Deno with Hono framework
- PostgreSQL database
- Redis for caching
- S3 for file storage

### Tab: Infrastructure
<!-- tab-id: tab_1771784034588_707u -->

<!-- tab-id: tab_infra -->

- AWS ECS for containers
- CloudFront CDN
- Route53 DNS
- Terraform for IaC

### Tab: Hello
<!-- tab-id: tab_1771784034588_w1h2 -->

<!-- tab-id: tab_1771209579776_zg0vszck1 -->

Hello World !

<!-- End Custom Section -->