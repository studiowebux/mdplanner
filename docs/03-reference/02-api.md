# REST API

Base URL: `http://localhost:8003/api`

All endpoints return JSON. Mutations return the created/updated entity or
`204 No Content` on delete.

When `--api-token` is configured, all endpoints except `/api/health`,
`/api/version`, and `/api/auth/*` require authentication via session cookie or
`Authorization: Bearer <token>` header.

## Core

| Method   | Path                | Description             |
| -------- | ------------------- | ----------------------- |
| `GET`    | `/health`           | Health check (status, version, uptime, cache) |
| `GET`    | `/version`          | Server version          |
| `GET`    | `/project/config`   | Project metadata        |
| `PUT`    | `/project/config`   | Update project metadata |

## Authentication

Available when `--api-token` is configured.

| Method | Path             | Description                    |
| ------ | ---------------- | ------------------------------ |
| `POST` | `/auth/login`    | Authenticate and set session cookie |
| `POST` | `/auth/logout`   | Clear session cookie           |
| `GET`  | `/auth/status`   | Check authentication status    |

## Tasks

| Method   | Path              | Description                  |
| -------- | ----------------- | ---------------------------- |
| `GET`    | `/tasks`          | List tasks (query: `section`, `assignee`, `milestone`, `project`, `tags`, `priority`, `ready`, `completed`) |
| `GET`    | `/tasks/:id`      | Get task by ID               |
| `POST`   | `/tasks`          | Create task                  |
| `PUT`    | `/tasks/:id`      | Update task                  |
| `DELETE` | `/tasks/:id`      | Delete task                  |
| `PATCH`  | `/tasks/:id/move` | Move task to section         |

## Notes

| Method   | Path           | Description       |
| -------- | -------------- | ----------------- |
| `GET`    | `/notes`       | List notes        |
| `GET`    | `/notes/:id`   | Get note with full content |
| `POST`   | `/notes`       | Create note       |
| `PUT`    | `/notes/:id`   | Update note       |
| `DELETE` | `/notes/:id`   | Delete note       |

## Goals

| Method   | Path           | Description                         |
| -------- | -------------- | ----------------------------------- |
| `GET`    | `/goals`       | List goals (query: `status`, `type`) |
| `GET`    | `/goals/:id`   | Get goal by ID                      |
| `POST`   | `/goals`       | Create goal                         |
| `PUT`    | `/goals/:id`   | Update goal                         |
| `DELETE` | `/goals/:id`   | Delete goal                         |

## Milestones

| Method   | Path                | Description               |
| -------- | ------------------- | ------------------------- |
| `GET`    | `/milestones`       | List milestones           |
| `GET`    | `/milestones/:id`   | Get milestone             |
| `POST`   | `/milestones`       | Create milestone          |
| `PUT`    | `/milestones/:id`   | Update milestone          |
| `DELETE` | `/milestones/:id`   | Delete milestone          |

## Ideas

| Method   | Path           | Description    |
| -------- | -------------- | -------------- |
| `GET`    | `/ideas`       | List ideas     |
| `GET`    | `/ideas/:id`   | Get idea       |
| `POST`   | `/ideas`       | Create idea    |
| `PUT`    | `/ideas/:id`   | Update idea    |
| `DELETE` | `/ideas/:id`   | Delete idea    |

## People

| Method   | Path            | Description     |
| -------- | --------------- | --------------- |
| `GET`    | `/people`       | List people     |
| `GET`    | `/people/:id`   | Get person      |
| `POST`   | `/people`       | Create person   |
| `PUT`    | `/people/:id`   | Update person   |
| `DELETE` | `/people/:id`   | Delete person   |

## Meetings

| Method   | Path              | Description     |
| -------- | ----------------- | --------------- |
| `GET`    | `/meetings`       | List meetings   |
| `GET`    | `/meetings/:id`   | Get meeting     |
| `POST`   | `/meetings`       | Create meeting  |
| `PUT`    | `/meetings/:id`   | Update meeting  |
| `DELETE` | `/meetings/:id`   | Delete meeting  |

## Journal

| Method   | Path             | Description      |
| -------- | ---------------- | ---------------- |
| `GET`    | `/journal`       | List entries     |
| `GET`    | `/journal/:id`   | Get entry        |
| `POST`   | `/journal`       | Create entry     |
| `PUT`    | `/journal/:id`   | Update entry     |
| `DELETE` | `/journal/:id`   | Delete entry     |

## Retrospectives

| Method   | Path                    | Description          |
| -------- | ----------------------- | -------------------- |
| `GET`    | `/retrospectives`       | List retrospectives  |
| `GET`    | `/retrospectives/:id`   | Get retrospective    |
| `POST`   | `/retrospectives`       | Create retrospective |
| `PUT`    | `/retrospectives/:id`   | Update retrospective |
| `DELETE` | `/retrospectives/:id`   | Delete retrospective |

## Portfolio

| Method   | Path               | Description       |
| -------- | ------------------ | ----------------- |
| `GET`    | `/portfolio`       | List items        |
| `GET`    | `/portfolio/:id`   | Get item          |
| `POST`   | `/portfolio`       | Create item       |
| `PUT`    | `/portfolio/:id`   | Update item       |
| `DELETE` | `/portfolio/:id`   | Delete item       |

## Canvas

| Method   | Path                       | Description          |
| -------- | -------------------------- | -------------------- |
| `GET`    | `/canvas/sticky_notes`     | List canvases        |
| `GET`    | `/canvas/sticky_notes/:id` | Get canvas           |
| `POST`   | `/canvas/sticky_notes`     | Create canvas        |
| `PUT`    | `/canvas/sticky_notes/:id` | Update canvas        |
| `DELETE` | `/canvas/sticky_notes/:id` | Delete canvas        |

## Mindmaps

| Method   | Path              | Description     |
| -------- | ----------------- | --------------- |
| `GET`    | `/mindmaps`       | List mindmaps   |
| `GET`    | `/mindmaps/:id`   | Get mindmap     |
| `POST`   | `/mindmaps`       | Create mindmap  |
| `PUT`    | `/mindmaps/:id`   | Update mindmap  |
| `DELETE` | `/mindmaps/:id`   | Delete mindmap  |

## C4 Architecture

| Method   | Path        | Description      |
| -------- | ----------- | ---------------- |
| `GET`    | `/c4`       | List diagrams    |
| `GET`    | `/c4/:id`   | Get diagram      |
| `POST`   | `/c4`       | Create diagram   |
| `PUT`    | `/c4/:id`   | Update diagram   |
| `DELETE` | `/c4/:id`   | Delete diagram   |

## SWOT

| Method   | Path          | Description   |
| -------- | ------------- | ------------- |
| `GET`    | `/swot`       | List analyses |
| `GET`    | `/swot/:id`   | Get analysis  |
| `POST`   | `/swot`       | Create        |
| `PUT`    | `/swot/:id`   | Update        |
| `DELETE` | `/swot/:id`   | Delete        |

## Risk Analysis

| Method   | Path                   | Description   |
| -------- | ---------------------- | ------------- |
| `GET`    | `/risk-analysis`       | List risks    |
| `GET`    | `/risk-analysis/:id`   | Get risk      |
| `POST`   | `/risk-analysis`       | Create        |
| `PUT`    | `/risk-analysis/:id`   | Update        |
| `DELETE` | `/risk-analysis/:id`   | Delete        |

## Lean Canvas

| Method   | Path                 | Description      |
| -------- | -------------------- | ---------------- |
| `GET`    | `/lean-canvas`       | List canvases    |
| `GET`    | `/lean-canvas/:id`   | Get canvas       |
| `POST`   | `/lean-canvas`       | Create           |
| `PUT`    | `/lean-canvas/:id`   | Update           |
| `DELETE` | `/lean-canvas/:id`   | Delete           |

## Business Model

| Method   | Path                    | Description   |
| -------- | ----------------------- | ------------- |
| `GET`    | `/business-model`       | List models   |
| `GET`    | `/business-model/:id`   | Get model     |
| `POST`   | `/business-model`       | Create        |
| `PUT`    | `/business-model/:id`   | Update        |
| `DELETE` | `/business-model/:id`   | Delete        |

## Project Value Board

| Method   | Path                         | Description   |
| -------- | ---------------------------- | ------------- |
| `GET`    | `/project-value-board`       | List boards   |
| `GET`    | `/project-value-board/:id`   | Get board     |
| `POST`   | `/project-value-board`       | Create        |
| `PUT`    | `/project-value-board/:id`   | Update        |
| `DELETE` | `/project-value-board/:id`   | Delete        |

## Brief

| Method   | Path           | Description   |
| -------- | -------------- | ------------- |
| `GET`    | `/brief`       | List briefs   |
| `GET`    | `/brief/:id`   | Get brief     |
| `POST`   | `/brief`       | Create        |
| `PUT`    | `/brief/:id`   | Update        |
| `DELETE` | `/brief/:id`   | Delete        |

## Strategic Levels

| Method   | Path                      | Description   |
| -------- | ------------------------- | ------------- |
| `GET`    | `/strategic-levels`       | List levels   |
| `GET`    | `/strategic-levels/:id`   | Get level     |
| `POST`   | `/strategic-levels`       | Create        |
| `PUT`    | `/strategic-levels/:id`   | Update        |
| `DELETE` | `/strategic-levels/:id`   | Delete        |

## MoSCoW

| Method   | Path            | Description      |
| -------- | --------------- | ---------------- |
| `GET`    | `/moscow`       | List analyses    |
| `GET`    | `/moscow/:id`   | Get analysis     |
| `POST`   | `/moscow`       | Create           |
| `PUT`    | `/moscow/:id`   | Update           |
| `DELETE` | `/moscow/:id`   | Delete           |

## Eisenhower

| Method   | Path                | Description     |
| -------- | ------------------- | --------------- |
| `GET`    | `/eisenhower`       | List matrices   |
| `GET`    | `/eisenhower/:id`   | Get matrix      |
| `POST`   | `/eisenhower`       | Create          |
| `PUT`    | `/eisenhower/:id`   | Update          |
| `DELETE` | `/eisenhower/:id`   | Delete          |

## Capacity Planning

| Method   | Path              | Description     |
| -------- | ----------------- | --------------- |
| `GET`    | `/capacity`       | List plans      |
| `GET`    | `/capacity/:id`   | Get plan        |
| `POST`   | `/capacity`       | Create          |
| `PUT`    | `/capacity/:id`   | Update          |
| `DELETE` | `/capacity/:id`   | Delete          |

## Time Tracking

| Method   | Path                      | Description              |
| -------- | ------------------------- | ------------------------ |
| `GET`    | `/time-entries/:taskId`   | List entries for a task  |
| `POST`   | `/time-entries/:taskId`   | Create entry             |
| `DELETE` | `/time-entries/:taskId`   | Delete entry             |

## Billing

| Method   | Path                        | Description      |
| -------- | --------------------------- | ---------------- |
| `GET`    | `/billing/customers`        | List customers   |
| `POST`   | `/billing/customers`        | Create customer  |
| `PUT`    | `/billing/customers/:id`    | Update customer  |
| `DELETE` | `/billing/customers/:id`    | Delete customer  |
| `GET`    | `/billing/quotes`           | List quotes      |
| `POST`   | `/billing/quotes`           | Create quote     |
| `PUT`    | `/billing/quotes/:id`       | Update quote     |
| `DELETE` | `/billing/quotes/:id`       | Delete quote     |
| `GET`    | `/billing/invoices`         | List invoices    |
| `POST`   | `/billing/invoices`         | Create invoice   |
| `PUT`    | `/billing/invoices/:id`     | Update invoice   |
| `DELETE` | `/billing/invoices/:id`     | Delete invoice   |

## CRM

| Method   | Path                    | Description       |
| -------- | ----------------------- | ----------------- |
| `GET`    | `/crm/companies`        | List companies   |
| `POST`   | `/crm/companies`        | Create company   |
| `PUT`    | `/crm/companies/:id`    | Update company   |
| `DELETE` | `/crm/companies/:id`    | Delete company   |
| `GET`    | `/crm/contacts`         | List contacts    |
| `POST`   | `/crm/contacts`         | Create contact   |
| `PUT`    | `/crm/contacts/:id`     | Update contact   |
| `DELETE` | `/crm/contacts/:id`     | Delete contact   |
| `GET`    | `/crm/deals`            | List deals       |
| `POST`   | `/crm/deals`            | Create deal      |
| `PUT`    | `/crm/deals/:id`        | Update deal      |
| `DELETE` | `/crm/deals/:id`        | Delete deal      |

## Finances

| Method   | Path              | Description     |
| -------- | ----------------- | --------------- |
| `GET`    | `/finances`       | List records    |
| `GET`    | `/finances/:id`   | Get record      |
| `POST`   | `/finances`       | Create          |
| `PUT`    | `/finances/:id`   | Update          |
| `DELETE` | `/finances/:id`   | Delete          |

## Fundraising

| Method   | Path               | Description      |
| -------- | ------------------ | ---------------- |
| `GET`    | `/safe`            | List SAFEs       |
| `POST`   | `/safe`            | Create SAFE      |
| `PUT`    | `/safe/:id`        | Update SAFE      |
| `DELETE` | `/safe/:id`        | Delete SAFE      |
| `GET`    | `/investors`       | List investors   |
| `POST`   | `/investors`       | Create investor  |
| `PUT`    | `/investors/:id`   | Update investor  |
| `DELETE` | `/investors/:id`   | Delete investor  |
| `GET`    | `/kpis`            | List KPIs        |
| `POST`   | `/kpis`            | Create KPI       |
| `PUT`    | `/kpis/:id`        | Update KPI       |
| `DELETE` | `/kpis/:id`        | Delete KPI       |

## Onboarding

| Method   | Path                          | Description          |
| -------- | ----------------------------- | -------------------- |
| `GET`    | `/onboarding`                 | List checklists      |
| `POST`   | `/onboarding`                 | Create checklist     |
| `PUT`    | `/onboarding/:id`             | Update checklist     |
| `DELETE` | `/onboarding/:id`             | Delete checklist     |
| `GET`    | `/onboarding-templates`       | List templates       |
| `POST`   | `/onboarding-templates`       | Create template      |
| `DELETE` | `/onboarding-templates/:id`   | Delete template      |

## Habits

| Method   | Path            | Description   |
| -------- | --------------- | ------------- |
| `GET`    | `/habits`       | List habits   |
| `POST`   | `/habits`       | Create habit  |
| `PUT`    | `/habits/:id`   | Update habit  |
| `DELETE` | `/habits/:id`   | Delete habit  |

## Fishbone

| Method   | Path              | Description     |
| -------- | ----------------- | --------------- |
| `GET`    | `/fishbone`       | List diagrams   |
| `POST`   | `/fishbone`       | Create diagram  |
| `PUT`    | `/fishbone/:id`   | Update diagram  |
| `DELETE` | `/fishbone/:id`   | Delete diagram  |

## Marketing Plans

| Method   | Path                    | Description        |
| -------- | ----------------------- | ------------------ |
| `GET`    | `/marketing-plans`      | List plans         |
| `POST`   | `/marketing-plans`      | Create plan        |
| `PUT`    | `/marketing-plans/:id`  | Update plan        |
| `DELETE` | `/marketing-plans/:id`  | Delete plan        |

## DNS

| Method   | Path          | Description      |
| -------- | ------------- | ---------------- |
| `GET`    | `/dns`        | List domains     |
| `POST`   | `/dns`        | Create domain    |
| `PUT`    | `/dns/:id`    | Update domain    |
| `DELETE` | `/dns/:id`    | Delete domain    |

## Org Chart

| Method | Path          | Description              |
| ------ | ------------- | ------------------------ |
| `GET`  | `/orgchart`   | Get org chart hierarchy  |

## Analytics

| Method | Path           | Description                              |
| ------ | -------------- | ---------------------------------------- |
| `GET`  | `/analytics`   | Dashboard data (task completion, goals)  |

## Search

Requires `--cache`.

| Method | Path                | Description                 |
| ------ | ------------------- | --------------------------- |
| `GET`  | `/search`           | Full-text search (query: `q`, `types`, `limit`) |
| `POST` | `/search/rebuild`   | Rebuild search index        |
| `GET`  | `/search/status`    | Index status                |

## Export / Import

| Method | Path                    | Description       |
| ------ | ----------------------- | ----------------- |
| `GET`  | `/export/csv/tasks`     | Export tasks CSV  |
| `POST` | `/import/csv/tasks`     | Import tasks CSV  |

## Backup

| Method | Path                   | Description                              |
| ------ | ---------------------- | ---------------------------------------- |
| `GET`  | `/backup/export`       | Download backup (plain or encrypted)     |
| `POST` | `/backup/import`       | Upload and restore backup                |
| `POST` | `/backup/trigger`      | Trigger manual backup (requires `--backup-dir`) |
| `GET`  | `/backup/status`       | Backup scheduler status                  |

## Uploads

| Method   | Path              | Description     |
| -------- | ----------------- | --------------- |
| `GET`    | `/uploads`        | List uploads    |
| `POST`   | `/uploads`        | Upload file     |
| `DELETE` | `/uploads/:name`  | Delete file     |

## Integrations

| Method | Path                              | Description                |
| ------ | --------------------------------- | -------------------------- |
| `GET`  | `/integrations/secrets`           | List configured secrets    |
| `PUT`  | `/integrations/secrets`           | Save integration secret    |
| `GET`  | `/integrations/github/repos`      | List GitHub repos          |
| `GET`  | `/integrations/github/repos/:id`  | Get repo details           |
| `GET`  | `/integrations/github/issues`     | List issues                |
| `POST` | `/integrations/github/issues`     | Create issue               |

## SSE Events

| Method | Path       | Description                        |
| ------ | ---------- | ---------------------------------- |
| `GET`  | `/events`  | Server-sent events stream          |

## TTS Proxy

| Method | Path   | Description                          |
| ------ | ------ | ------------------------------------ |
| `POST` | `/tts` | Proxy to Chatterbox TTS service      |
