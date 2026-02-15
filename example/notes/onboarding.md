---
id: note_onboarding
created: 2026-01-20T14:00:00Z
updated: 2026-01-20T14:00:00Z
revision: 1
mode: simple
---

# Developer Onboarding

## Prerequisites

- Deno 2.x installed
- Docker and Docker Compose
- PostgreSQL client (psql or GUI)
- AWS CLI configured (for staging/prod)

## Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Run `docker-compose up -d` for database
4. Run `deno task dev` to start development server
5. Open http://localhost:3000

## Key Commands

- `deno task dev` - Start dev server with hot reload
- `deno task test` - Run test suite
- `deno task lint` - Run linter
- `deno task db:migrate` - Run database migrations
- `deno task db:seed` - Seed demo data

## Team Contacts

- Alice (Tech Lead): alice@taskflow.io
- Bob (Backend): bob@taskflow.io
- Charlie (Frontend): charlie@taskflow.io
- Diana (DevOps): diana@taskflow.io
