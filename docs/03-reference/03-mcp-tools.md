---
title: MCP Tools
---

# MCP Tools

MD Planner exposes 244 tools via the Model Context Protocol. Connect via stdio
(compiled binary) or HTTP (`/mcp` endpoint with `--mcp-token`).

Tools follow a consistent pattern per entity: `list_*`, `get_*`, `create_*`,
`update_*`, `delete_*`.

## Tasks

| Tool                  | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `list_tasks`          | List tasks with filters (section, project, milestone, assignee, priority, tags, ready, completed) |
| `get_task`            | Get task by ID with full description and comments        |
| `create_task`         | Create task — returns full task object (not just `{id}`)                 |
| `update_task`         | Update any task field including section, assignee, milestone, files — returns full task object |
| `delete_task`         | Delete task by ID                                        |
| `add_task_comment`    | Add comment to task (with optional metadata)             |
| `add_task_attachments`| Add file attachments to task                             |
| `move_task`           | Move task to a different section                         |
| `claim_task`          | Claim task for an agent (concurrency-safe)               |
| `batch_update_tasks`  | Update up to 50 tasks in one call                        |
| `get_next_task`       | Get next available task by priority (skill-aware)        |
| `sweep_stale_claims`  | Release tasks claimed longer than timeout                        |
| `request_approval`    | Submit task for human review — moves to Pending Review           |
| `approve_task`        | Approve a Pending Review task — moves to Done                    |
| `reject_task`         | Reject a Pending Review task — returns to In Progress            |
| `list_pending_approvals` | List all tasks in Pending Review with approval request stubs  |

## Notes

| Tool                | Description                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| `list_notes`        | List notes (filter by search, project)                                      |
| `get_note`          | Get note by ID with full content                                            |
| `get_note_by_name`  | Get note by title (case-insensitive)                                        |
| `get_notes_batch`   | Fetch multiple notes by ID in one call — returns `{ notes, notFound }`      |
| `create_note`       | Create note                                                                 |
| `update_note`       | Update note title or content                                                |
| `delete_note`       | Delete note                                                                 |

## Goals

| Tool           | Description                             |
| -------------- | --------------------------------------- |
| `list_goals`   | List goals (filter by status, type)     |
| `get_goal`     | Get goal by ID                          |
| `create_goal`  | Create goal                             |
| `update_goal`  | Update goal                             |
| `delete_goal`  | Delete goal                             |

## Milestones

| Tool                | Description                           |
| ------------------- | ------------------------------------- |
| `list_milestones`   | List milestones (filter by project, status) |
| `get_milestone`     | Get milestone by ID                   |
| `create_milestone`  | Create milestone                      |
| `update_milestone`  | Update milestone                      |
| `delete_milestone`  | Delete milestone                      |

## Ideas

| Tool           | Description     |
| -------------- | --------------- |
| `list_ideas`   | List ideas      |
| `get_idea`     | Get idea        |
| `create_idea`  | Create idea     |
| `update_idea`  | Update idea     |
| `delete_idea`  | Delete idea     |

## People

| Tool                    | Description                         |
| ----------------------- | ----------------------------------- |
| `list_people`           | List all people                     |
| `get_person`            | Get person by ID                    |
| `get_people_tree`       | Get org chart hierarchy             |
| `get_people_summary`    | Get people count and role summary   |
| `get_people_departments`| List departments                    |
| `get_person_reports`    | Get direct reports for a person     |
| `create_person`         | Create person                       |
| `update_person`         | Update person                       |
| `delete_person`         | Delete person                       |

## Meetings

| Tool              | Description                        |
| ----------------- | ---------------------------------- |
| `list_meetings`   | List meetings (filter by date range, open actions) |
| `get_meeting`     | Get meeting with action items      |
| `create_meeting`  | Create meeting                     |
| `update_meeting`  | Update meeting                     |
| `delete_meeting`  | Delete meeting                     |

## Journal

| Tool                    | Description          |
| ----------------------- | -------------------- |
| `list_journal_entries`  | List journal entries |
| `get_journal_entry`     | Get entry            |
| `create_journal_entry`  | Create entry         |
| `update_journal_entry`  | Update entry         |
| `delete_journal_entry`  | Delete entry         |

## Retrospectives

| Tool                     | Description            |
| ------------------------ | ---------------------- |
| `list_retrospectives`    | List retrospectives    |
| `get_retrospective`      | Get retrospective      |
| `create_retrospective`   | Create retrospective   |
| `update_retrospective`   | Update retrospective   |
| `delete_retrospective`   | Delete retrospective   |

## Portfolio

| Tool                             | Description               |
| -------------------------------- | ------------------------- |
| `list_portfolio`                 | List portfolio items      |
| `get_portfolio_item`             | Get item                  |
| `get_portfolio_summary`          | Get portfolio summary     |
| `create_portfolio_item`          | Create item               |
| `update_portfolio_item`          | Update item               |
| `add_portfolio_status_update`    | Add status update         |
| `delete_portfolio_status_update` | Delete status update      |
| `delete_portfolio_item`          | Delete item               |

## Canvas

| Tool                   | Description            |
| ---------------------- | ---------------------- |
| `list_sticky_notes`    | List canvases          |
| `create_sticky_note`   | Create sticky note     |
| `delete_sticky_note`   | Delete sticky note     |

## Mindmaps

| Tool              | Description      |
| ----------------- | ---------------- |
| `list_mindmaps`   | List mindmaps    |
| `get_mindmap`     | Get mindmap      |
| `create_mindmap`  | Create mindmap   |
| `update_mindmap`  | Update mindmap   |
| `delete_mindmap`  | Delete mindmap   |

## C4 Architecture

No dedicated MCP tools. Use the REST API for C4 diagrams.

## SWOT

| Tool           | Description   |
| -------------- | ------------- |
| `list_swot`    | List SWOT     |
| `get_swot`     | Get SWOT      |
| `create_swot`  | Create SWOT   |
| `update_swot`  | Update SWOT   |
| `delete_swot`  | Delete SWOT   |

## Risk Analysis

| Tool           | Description   |
| -------------- | ------------- |
| `list_risks`   | List risks    |
| `get_risk`     | Get risk      |
| `create_risk`  | Create risk   |
| `update_risk`  | Update risk   |
| `delete_risk`  | Delete risk   |

## Lean Canvas

| Tool                 | Description        |
| -------------------- | ------------------ |
| `list_lean_canvas`   | List canvases      |
| `get_lean_canvas`    | Get canvas         |
| `create_lean_canvas` | Create canvas      |
| `update_lean_canvas` | Update canvas      |
| `delete_lean_canvas` | Delete canvas      |

## Business Model

| Tool                    | Description      |
| ----------------------- | ---------------- |
| `list_business_model`   | List models      |
| `get_business_model`    | Get model        |
| `create_business_model` | Create model     |
| `update_business_model` | Update model     |
| `delete_business_model` | Delete model     |

## Project Value

| Tool                     | Description    |
| ------------------------ | -------------- |
| `list_project_value`     | List boards    |
| `get_project_value`      | Get board      |
| `create_project_value`   | Create board   |
| `update_project_value`   | Update board   |
| `delete_project_value`   | Delete board   |

## Strategic Levels

| Tool                       | Description      |
| -------------------------- | ---------------- |
| `list_strategic_levels`    | List levels      |
| `get_strategic_levels`     | Get level        |
| `create_strategic_levels`  | Create level     |
| `update_strategic_levels`  | Update level     |
| `delete_strategic_levels`  | Delete level     |

## SAFEs (Fundraising)

| Tool           | Description   |
| -------------- | ------------- |
| `list_safe`    | List SAFEs    |
| `get_safe`     | Get SAFE      |
| `create_safe`  | Create SAFE   |
| `update_safe`  | Update SAFE   |
| `delete_safe`  | Delete SAFE   |

## Brief

| Tool            | Description    |
| --------------- | -------------- |
| `list_briefs`   | List briefs    |
| `get_brief`     | Get brief      |
| `create_brief`  | Create brief   |
| `update_brief`  | Update brief   |
| `delete_brief`  | Delete brief   |

## MoSCoW

| Tool            | Description     |
| --------------- | --------------- |
| `list_moscow`   | List analyses   |
| `get_moscow`    | Get analysis    |
| `create_moscow` | Create analysis |
| `update_moscow` | Update analysis |
| `delete_moscow` | Delete analysis |

## Eisenhower

| Tool                | Description      |
| ------------------- | ---------------- |
| `list_eisenhower`   | List matrices    |
| `get_eisenhower`    | Get matrix       |
| `create_eisenhower` | Create matrix    |
| `update_eisenhower` | Update matrix    |
| `delete_eisenhower` | Delete matrix    |

## Capacity Planning

| Tool                        | Description               |
| --------------------------- | ------------------------- |
| `list_capacity_plans`       | List capacity plans       |
| `get_capacity_plan`         | Get plan                  |
| `create_capacity_plan`      | Create plan               |
| `update_capacity_plan`      | Update plan               |
| `add_capacity_member`       | Add member to plan        |
| `remove_capacity_member`    | Remove member from plan   |
| `add_capacity_allocation`   | Add allocation            |
| `remove_capacity_allocation`| Remove allocation         |
| `delete_capacity_plan`      | Delete plan               |

## Billing

| Tool               | Description       |
| ------------------ | ----------------- |
| `list_customers`   | List customers    |
| `get_customer`     | Get customer      |
| `create_customer`  | Create customer   |
| `update_customer`  | Update customer   |
| `delete_customer`  | Delete customer   |
| `list_quotes`      | List quotes       |
| `get_quote`        | Get quote         |
| `create_quote`     | Create quote      |
| `update_quote`     | Update quote      |
| `delete_quote`     | Delete quote      |
| `list_invoices`    | List invoices     |
| `get_invoice`      | Get invoice       |
| `create_invoice`   | Create invoice    |
| `update_invoice`   | Update invoice    |
| `delete_invoice`   | Delete invoice    |

## CRM

| Tool               | Description       |
| ------------------ | ----------------- |
| `list_companies`   | List companies    |
| `get_company`      | Get company       |
| `create_company`   | Create company    |
| `update_company`   | Update company    |
| `delete_company`   | Delete company    |
| `list_contacts`    | List contacts     |
| `get_contact`      | Get contact       |
| `create_contact`   | Create contact    |
| `update_contact`   | Update contact    |
| `delete_contact`   | Delete contact    |
| `list_deals`       | List deals        |
| `get_deal`         | Get deal          |
| `create_deal`      | Create deal       |
| `update_deal`      | Update deal       |
| `delete_deal`      | Delete deal       |

## Finances

| Tool              | Description      |
| ----------------- | ---------------- |
| `list_finances`   | List records     |
| `get_finance`     | Get record       |
| `create_finance`  | Create record    |
| `update_finance`  | Update record    |
| `delete_finance`  | Delete record    |

## Fundraising

| Tool               | Description       |
| ------------------ | ----------------- |
| `list_investors`   | List investors    |
| `get_investor`     | Get investor      |
| `create_investor`  | Create investor   |
| `update_investor`  | Update investor   |
| `delete_investor`  | Delete investor   |

## KPIs

| Tool           | Description   |
| -------------- | ------------- |
| `list_kpis`    | List KPIs     |
| `get_kpi`      | Get KPI       |
| `create_kpi`   | Create KPI    |
| `update_kpi`   | Update KPI    |
| `delete_kpi`   | Delete KPI    |

## Habits

| Tool                   | Description                  |
| ---------------------- | ---------------------------- |
| `list_habits`          | List habits                  |
| `get_habit`            | Get habit                    |
| `create_habit`         | Create habit                 |
| `update_habit`         | Update habit                 |
| `mark_habit_complete`  | Mark habit done for a date   |
| `unmark_habit_complete`| Unmark habit for a date      |
| `delete_habit`         | Delete habit                 |

## Fishbone

| Tool               | Description       |
| ------------------ | ----------------- |
| `list_fishbones`   | List diagrams     |
| `get_fishbone`     | Get diagram       |
| `create_fishbone`  | Create diagram    |
| `update_fishbone`  | Update diagram    |
| `delete_fishbone`  | Delete diagram    |

## DNS

| Tool                    | Description                    |
| ----------------------- | ------------------------------ |
| `list_dns_domains`      | List domains                   |
| `get_dns_domain`        | Get domain                     |
| `create_dns_domain`     | Create domain                  |
| `update_dns_domain`     | Update domain                  |
| `delete_dns_domain`     | Delete domain                  |
| `sync_cloudflare_dns`   | Sync from Cloudflare           |
| `list_dns_records`      | List DNS records for a domain  |
| `add_dns_record`        | Add record                     |
| `update_dns_record`     | Update record                  |
| `delete_dns_record`     | Delete record                  |

## GitHub

| Tool                    | Description                     |
| ----------------------- | ------------------------------- |
| `github_get_repo`       | Get repository summary          |
| `github_get_issue`      | Get issue details               |
| `github_create_issue`   | Create issue                    |
| `github_set_issue_state`| Open or close issue             |
| `github_list_repos`     | List repositories               |
| `github_get_pr`         | Get pull request details        |

## Marketing Plans

| Tool                     | Description           |
| ------------------------ | --------------------- |
| `list_marketing_plans`   | List plans            |
| `get_marketing_plan`     | Get plan              |
| `create_marketing_plan`  | Create plan           |
| `update_marketing_plan`  | Update plan           |
| `delete_marketing_plan`  | Delete plan           |

## Onboarding

| Tool                          | Description            |
| ----------------------------- | ---------------------- |
| `list_onboarding`             | List checklists        |
| `get_onboarding`              | Get checklist          |
| `create_onboarding`           | Create checklist       |
| `update_onboarding`           | Update checklist       |
| `delete_onboarding`           | Delete checklist       |
| `list_onboarding_templates`   | List templates         |
| `get_onboarding_template`     | Get template           |
| `create_onboarding_template`  | Create template        |
| `delete_onboarding_template`  | Delete template        |

## Project

| Tool                    | Description                  |
| ----------------------- | ---------------------------- |
| `get_project_config`    | Get project metadata         |
| `update_project_config` | Update project configuration |

## Search

Requires `--cache`.

| Tool       | Description                              |
| ---------- | ---------------------------------------- |
| `search`   | Full-text search across all entity types |

## Agent Coordination

| Tool                | Description                          |
| ------------------- | ------------------------------------ |
| `agent_heartbeat`   | Register agent presence and health   |

## Analytics

| Tool             | Description                            |
| ---------------- | -------------------------------------- |
| `get_analytics`  | Dashboard data (tasks, goals, trends)  |

## Context Pack

| Tool                | Description                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `get_context_pack`  | Single-call agent boot — returns people, active milestone, in-progress tasks (with `relevantFiles`), top-10 todo, recent progress excerpt, and decision/architecture/constraint note stubs |

## Time Tracking

| Tool                       | Description                        |
| -------------------------- | ---------------------------------- |
| `list_time_entries`        | List all time entries              |
| `get_time_entries_for_task`| Get time entries for a task        |
| `create_time_entry`        | Log time against a task            |
| `delete_time_entry`        | Delete a time entry                |

## MCP Prompts

Registered prompts surface as `/slash-commands` in Claude Code. Dynamic
prompts (`/daily`, `/next`) fetch live task data at render time.

| Prompt            | Arguments              | Description                                                    |
| ----------------- | ---------------------- | -------------------------------------------------------------- |
| `/session-start`  | `project?`             | Full Phase 1 boot — reads local-dev.md, calls get_context_pack, checks git state |
| `/end-session`    | —                      | Write progress note + HANDOFF.md + move completed tasks to Pending Review |
| `/daily`          | `project?`             | Live standup: tasks done/in-progress/blocked in last 24 h      |
| `/approve`        | `task_id`, `feedback?` | Approve a Pending Review task and move to Done                 |
| `/next`           | `project?`             | Highest-priority ready task — what to work on right now        |
