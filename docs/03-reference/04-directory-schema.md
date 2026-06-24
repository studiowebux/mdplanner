---
title: Directory Schema
---

# Directory Schema

Every entity is a markdown file with YAML frontmatter. The directory name
determines the entity type. The file name is arbitrary but conventionally uses
the entity type as a prefix (e.g., `task_auth.md`).

## Tasks

Directory: `board/{section}/`

The subdirectory name is the task's section (status column). IDs use the
timestamped format `task_<timestamp>_<random>`.

```yaml
---
id: task_1771807748170_5wtz
completed: false
tags: [feature, security]
due_date: 2026-03-01
assignee: alice
priority: 1
effort: 5
milestone: v1.0.0
blocked_by: [task_1771807748200_abc1]
planned_start: 2026-02-20
planned_end: 2026-02-25
order: 0
project: "My Project"
createdAt: "2026-02-20T00:00:00.000Z"
updatedAt: "2026-02-20T00:00:00.000Z"
revision: 1
---

# Implement Authentication

Task description in markdown.
```

## Notes

Directory: `notes/`

All notes are enhanced in v2 — there is no `mode` field. Enhanced notes support
typed block sections: paragraphs, tabs, timelines, and split-views delimited by
`<!-- block:type -->` markers.

```yaml
---
id: note_1771807748170_arch
title: Architecture Overview
project: "My Project"
createdAt: "2026-01-05T10:00:00.000Z"
updatedAt: "2026-02-16T02:39:51.384Z"
revision: 7
---

# Architecture Overview

Note content in markdown. Sections are delimited by block markers.
```

## Goals

Directory: `goals/`

```yaml
---
id: goal_revenue
type: enterprise
kpi: "25% revenue increase"
start: 2026-01-01
end: 2026-12-31
status: on-track
---

# Revenue Target

Goal description.
```

Status values: `planning`, `on-track`, `at-risk`, `late`, `success`, `failed`.

Type values: `enterprise`, `project`.

## Milestones

Directory: `milestones/`

```yaml
---
id: milestone_beta
title: Beta Launch
target_date: 2026-04-01
status: open
---

# Beta Launch

Deliverables and acceptance criteria.
```

Status values: `open`, `completed`.

## Ideas

Directory: `ideas/`

```yaml
---
id: idea_templates
title: Project Templates
status: approved
category: feature
submitted_by: Alice
created: 2026-01-15
links: [idea_ai, idea_onboarding]
---

# Project Templates

Description and rationale.
```

Status values: `new`, `considering`, `planned`, `rejected`, `approved`.

## People

Directory: `people/`

```yaml
---
id: person_alice
name: Alice Smith
title: Engineering Lead
email: alice@company.com
phone: "+1 555 0100"
departments: [Engineering, Leadership]
reportsTo: person_ceo
role: developer
hoursPerDay: 8
workingDays: [Mon, Tue, Wed, Thu, Fri]
startDate: 2024-01-15
---

# Alice Smith
```

## Retrospectives

Directory: `retrospectives/`

```yaml
---
id: retro_q1
date: 2026-03-31
status: open
continue:
  - Weekly syncs
stop:
  - Scope creep
start:
  - Daily standups
---

# Q1 Retrospective
```

## MoSCoW

Directory: `moscow/`

```yaml
---
id: moscow_sprint1
date: 2026-02-22
must: [User authentication, Core API]
should: [Dashboard, Notifications]
could: [Dark mode, Export]
wont: [Mobile app]
---

# Sprint 1 Priorities
```

## Eisenhower

Directory: `eisenhower/`

```yaml
---
id: eisenhower_q1
date: 2026-02-22
urgentImportant: [Fix production bug, Deploy hotfix]
notUrgentImportant: [Plan architecture, Write tests]
urgentNotImportant: [Reply to emails, Schedule meetings]
notUrgentNotImportant: [Reorganize docs, Update profiles]
---

# Q1 Priorities
```

## Mindmaps

Directory: `mindmaps/`

```yaml
---
id: mindmap_product
---

# Product Features

- Core
  - Auth
  - Tasks
- Integrations
  - Slack
  - GitHub
```

Indented markdown lists define the tree structure.

## Portfolio

Directory: `portfolio/`

```yaml
---
id: portfolio_alpha
name: Project Alpha
status: active
startDate: 2026-01-01
endDate: 2026-06-30
budget: 150000
spent: 45000
team: [person_alice, person_bob]
githubRepo: studiowebux/project-alpha
vcsProvider: gitea
urls:
  - label: Docs
    href: https://example.com/docs
badges:
  - imageUrl: https://img.shields.io/badge/build-passing-green.svg
    linkUrl: https://example.com/repo
    alt: build status
---

# Project Alpha

Project description.
```

Status values: `active`, `completed`, `on-hold`, `cancelled`.

`vcsProvider` (`github` | `gitea`) is the VCS host this project's `githubRepo`
lives on — hosting is **per project**, so different portfolio items can target
different forges at the same time. Absent → GitHub; Gitea is opt-in per item, so
configuring Gitea never reroutes unset items. Set it from the "Repo host" select
on the portfolio form.

`urls` holds external links, each `{ label, href }`, entered through a multi-row
table (Label / URL per row) and rendered in the Links section of the detail
page. A row's URL field also accepts pasted markdown — `[label](href)` — which
is parsed into structured links on save.

`badges` holds external status badges (CI/CD/pipeline/git shields images),
each `{ imageUrl, linkUrl?, alt? }`. In the UI they are entered through a
multi-row table (Image URL / Link URL / Alt text per row); a row's Image URL
field also accepts pasted markdown image-links — `[![alt](img)](href)` or
`![alt](img)`, one or many — parsed into structured badges on save. Rendered as
the clickable badge image on the portfolio card and detail page.

## Capacity Plans

Directory: `capacity/`

```yaml
---
id: capacity_q1
weekStart: 2026-01-06
allocations:
  - personId: person_alice
    hours: 32
  - personId: person_bob
    hours: 24
---
```

## Briefs

Directory: `briefs/`

Planning documents with a RACI matrix and structured sections. Each H2
heading is keyword-matched to a named field; unrecognised headings are ignored.

```yaml
---
id: brief_beta
title: Beta Launch Brief
date: 2026-02-01
createdAt: "2026-02-01T00:00:00.000Z"
updatedAt: "2026-02-01T00:00:00.000Z"
---

# Beta Launch Brief

## Summary

Launch public beta to validate product-market fit with small tech teams.

## Mission

Deliver a reliable, feature-complete beta that generates actionable feedback.

## Responsible (R)

- Alice: Technical lead
- Bob: Backend development

## Accountable (A)

- Alice: Overall beta success

## Consulted (C)

- External beta testers

## Informed (I)

- Investors
- Advisory board

## High-Level Budget

- Infrastructure: $3,000
- Marketing: $2,000

## High-Level Timeline

- Feb 1–14: Feature completion
- Feb 15–28: Testing and polish

## Culture

- Ship fast, iterate faster

## Change Capacity

Team can handle scope changes until Feb 10.

## Guiding Principles

- Simple over feature-rich
- Accessibility first
```

Keyword-matched section headings (case-insensitive):

| Field               | Matched keywords                                    |
| ------------------- | --------------------------------------------------- |
| `summary`           | summary, executive summary, overview                |
| `mission`           | mission                                             |
| `responsible`       | responsible                                         |
| `accountable`       | accountable                                         |
| `consulted`         | consulted                                           |
| `informed`          | informed                                            |
| `highLevelBudget`   | budget, high level budget, high-level budget        |
| `highLevelTimeline` | timeline, high level timeline, high-level timeline  |
| `culture`           | culture                                             |
| `changeCapacity`    | change capacity, capacity for change                |
| `guidingPrinciples` | guiding principle, guiding principles, principles   |

RACI labels `(R)`, `(A)`, `(C)`, `(I)` in headings are stripped before matching.
Section content may be bullet lists or prose paragraphs — both are stored as
`string[]`.

## Lean Canvas

Directory: `leancanvas/`

Business model canvas with 12 sections. Frontmatter stores identity fields;
each section is an H2 heading followed by a bullet list. Section headings are
keyword-matched (case-insensitive) to their field names.

```yaml
---
id: lean_canvas_1234567890_abcd
title: TaskFlow Lean Canvas
project: TaskFlow
date: 2026-01-05
createdAt: "2026-01-05T00:00:00.000Z"
updatedAt: "2026-01-05T00:00:00.000Z"
---

# TaskFlow Lean Canvas

## Problem

- Existing tools are bloated and complex
- Poor UX leads to low adoption

## Solution

- Clean, focused interface
- Quick onboarding (< 5 minutes)

## Unique Value Proposition

Project management that gets out of your way.

## Unfair Advantage

- Deep developer experience focus
- Modern architecture

## Customer Segments

- Small tech teams (5–20 people)
- Freelancers and agencies

## Existing Alternatives

- Asana (complex, expensive)
- Trello (too simple)

## Key Metrics

- Monthly active users
- Paid conversion rate

## High-Level Concept

"Notion meets Linear for project management"

## Channels

- Product Hunt launch
- Developer communities

## Early Adopters

- Developer teams at startups
- Indie hackers

## Cost Structure

- Cloud infrastructure
- Team salaries

## Revenue Streams

- Freemium SaaS subscriptions
- Team plan: $8/user/month
```

Fields: `id` (prefix `lean_canvas`), `title`, `project` (optional),
`date` (YYYY-MM-DD, optional), `createdAt`, `updatedAt`, `createdBy`,
`updatedBy`.

Computed (not stored on disk): `completedSections` (0–12), `sectionCount`
(total bullet items), `completionPct` (0–100).

Section content may be bullet lists (`- item`) or plain prose paragraphs —
both are stored as `string[]`.

Keyword-matched section headings (case-insensitive):

| Field                  | Matched keywords                                      |
| ---------------------- | ----------------------------------------------------- |
| `problem`              | problem, problems                                     |
| `solution`             | solution, solutions                                   |
| `uniqueValueProp`      | unique value proposition, uvp, value proposition      |
| `unfairAdvantage`      | unfair advantage                                      |
| `customerSegments`     | customer segments, customers                          |
| `existingAlternatives` | existing alternatives, alternatives                   |
| `keyMetrics`           | key metrics, metrics                                  |
| `highLevelConcept`     | high-level concept, concept                           |
| `channels`             | channels                                              |
| `earlyAdopters`        | early adopters, adopters                              |
| `costStructure`        | cost structure, costs                                 |
| `revenueStreams`       | revenue streams, revenue                              |

## Other Entities

The following entities follow the same pattern of YAML frontmatter + markdown
body in their respective directories:

| Entity                  | Directory               |
| ----------------------- | ----------------------- |
| Canvas (sticky boards)  | `sticky-notes/`         |
| C4 Architecture         | `c4/`                   |
| SWOT                    | `swot/`                 |
| Risk Analysis           | `risk/`                 |
| Business Model          | `businessmodel/`        |
| Project Value           | `projectvalue/`         |
| Brief                   | `briefs/`               |
| Retrospective           | `retrospectives/`       |
| Strategic Levels        | `strategiclevels/`      |
| Billing                 | `billing/`              |
| Brainstorms             | `brainstorms/`          |
| Brainstorm Templates    | `brainstorm-templates/` |
| Reflections             | `reflections/`          |
| Reflection Templates    | `reflection-templates/` |
| SAFE Agreements         | `safe/`                 |
| Vacations               | `vacation/`             |

## Customers

Directory: `billing/customers/`

```yaml
---
id: customer_agency
name: DevAgency Inc
email: accounts@devagency.com
phone: "+1-555-0300"
company: DevAgency Inc
billingAddress:
  street: 789 Agency Way
  city: New York
  state: NY
  postalCode: "10001"
  country: USA
created_at: 2026-02-10
---

# DevAgency Inc

## Notes

Quarterly invoicing, NET 30 terms.
```

Fields: `id`, `name`, `email`, `phone`, `company`, `billingAddress` (nested
object with `street`, `city`, `state`, `postalCode`, `country`),
`created_at`, `updated_at`.

## Contacts

Directory: `contacts/`

```yaml
---
id: contact_jane_doe
name: Jane Doe
email: jane@example.com
phone: "+1-555-0100"
role: Head of Marketing
company: Acme Corp
type: lead
tags: [vip, q1-2026]
created_at: "2026-05-13T00:00:00.000Z"
updated_at: "2026-05-13T01:15:08.222Z"
---

# Jane Doe

## Notes

Met at the SaaStr conference. Interested in our Pro tier. Follow up Q1 2026.
```

Fields: `id`, `name`, `email`, `phone`, `role`, `company`, `type` (enum:
`lead`, `customer`, `partner`, `vendor`, `other`), `tags` (string array),
`notes` (markdown body), `created_at`, `updated_at`. The markdown body
under `## Notes` is parsed into the `notes` field.

## Billing Rates

Directory: `billing/rates/`

```yaml
---
id: rate_standard
name: Standard Rate
unit: h
rate: 150
currency: CAD
isDefault: true
created_at: 2026-02-10
---

# Standard Rate

## Notes

Default consulting/support rate.
```

Fields: `id`, `name`, `unit` (`h`, `d`, `unit`, `mo`, `fixed`), `rate`
(number), `currency` (ISO 4217, optional), `assignee` (person ID, optional),
`isDefault` (boolean), `created_at`, `updated_at`.

## Quotes

Directory: `billing/quotes/`

```yaml
---
id: quote_startup
number: Q-2026-001
customer_id: customer_startup
title: Team Plan Annual Subscription
status: accepted
currency: CAD
expires_at: 2026-03-01
tax_rate: 15
revision: 1
sent_at: 2026-02-02
accepted_at: 2026-02-05
converted_to_invoice: invoice_startup1
created_at: 2026-02-01
updated_at: 2026-02-05
line_items:
  - id: li_1
    type: service
    description: Team Plan (12 users) - Annual Subscription
    quantity: 12
    unit: unit
    unit_rate: 96
    taxable: true
payment_schedule:
  - description: 50% deposit
    percent: 50
    due_date: 2026-02-15
  - description: Balance on completion
    percent: 50
    due_date: 2026-03-01
---

# Quote: Team Plan Annual

## Notes

Annual subscription with 12-month commitment.

## Footer

Thank you for your business. Payment due within 30 days of invoice.
```

Stored fields: `id`, `number` (Q-YYYY-NNN), `customer_id`, `project_id`
(optional), `title`, `status` (`draft`, `pending_approval`, `approved`,
`sent`, `accepted`, `rejected`), `currency`, `expires_at`, `line_items`
(array of LineItem), `tax_rate`, `payment_schedule` (optional array), `notes`
(body), `footer` (body), `revision`, `converted_to_invoice`, `sent_at`,
`accepted_at`, `submitted_for_approval_at`, `approved_by`, `approved_at`,
`approval_notes`, `created_at`, `updated_at`.

Derived (computed on read from the line items — **never stored**): each line
item's `amount`, plus the quote-level `subtotal`, `tax`, and `total`. Editing
quantities/rates in the `.md` directly yields correct recomputed totals on the
next read.

## Invoices

Directory: `billing/invoices/`

An invoice **derives from a quote**: `quoteId` is required and the invoice owns
no billable data of its own. The customer, line items, and totals
(`subtotal`/`tax`/`total`) are derived from the referenced quote at read time and
are **not** stored in the invoice file — to change billable items you edit the
quote. The invoice persists only its own fields (status, dates, terms, payment
tracking, notes/footer) plus the `quoteId`/`projectId` references.

```yaml
---
id: invoice_startup1
number: INV-2026-001
quote_id: quote_startup
title: Team Plan Annual - Year 1
status: paid
currency: CAD
paid_amount: 1324.80
due_date: 2026-03-01
payment_terms: NET 30
sent_at: 2026-02-15
paid_at: 2026-02-28
created_at: 2026-02-15
updated_at: 2026-02-28
---

# Invoice: Startup Labs - Year 1

## Notes

Derived from quote Q-2026-001. Full annual subscription; line items and totals
come from the quote.
```

Stored fields: `id`, `number` (INV-YYYY-NNN), `quote_id` (required),
`project_id` (optional), `title`, `status` (`draft`, `sent`, `paid`,
`overdue`, `cancelled`), `currency`, `due_date`, `payment_terms`,
`paid_amount`, `description` (optional short client-visible summary),
`notes` (body), `footer` (body), `sent_at`, `paid_at`, `created_at`,
`updated_at`.

Derived (read-only, from the quote — never stored): `customer_id`,
`line_items`, `subtotal`, `tax`, `tax_rate`, `total`.

## Payments

Directory: `billing/payments/`

```yaml
---
id: payment_startup_dep
invoice_id: invoice_startup1
amount: 662.40
method: bank
date: 2026-02-18
reference: EFT-2026-0218
created_at: 2026-02-18
updated_at: 2026-02-18
---

# Payment: Startup Labs Deposit

## Notes

50% deposit via electronic funds transfer.
```

Fields: `id`, `invoice_id`, `amount` (number), `date` (YYYY-MM-DD),
`method` (`bank`, `card`, `cash`, `cheque`, `other`), `reference`,
`notes` (body), `created_at`, `updated_at`.

| CRM             | `crm/`             |
| Time Tracking   | `timetracking/`    |
| Meetings        | `meetings/`        |
| Journal         | `journal/`         |
| Onboarding      | `onboarding/`      |
| Finances        | `finances/`        |
| Habits          | `habits/`          |
| Fishbone        | `fishbone/`        |
| Marketing Plans | `marketing-plans/` |
| DNS             | `dns/`             |
| Fundraising     | `fundraising/`     |
