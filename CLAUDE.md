# CLAUDE.md - Comprehensive Test Project

This file tests ALL features of MD Planner for migration validation.

<!-- Configurations -->
# Configurations

Start Date: 2026-01-01
Working Days: 5
Last Updated: 2026-02-14T00:00:00.000Z
Status: active
Status Comment: Testing all features for migration

Assignees:
- Alice
- Bob
- Charlie
- Diana

Tags:
- Backend
- Frontend
- Bug
- Feature
- Documentation
- Testing
- Infrastructure
- Security

Links:
- [Project Repo](https://github.com/example/mdplanner)
- [Documentation](https://docs.example.com)
- [Issue Tracker](https://issues.example.com)

<!-- Notes -->
# Notes

## Test Note - Basic
<!-- id: note_test_1 | created: 2026-01-01T10:00:00.000Z | updated: 2026-01-01T10:00:00.000Z | rev: 1 -->

This is a basic note with **markdown** support.

- List item 1
- List item 2
- List item 3

```javascript
// Code block test
const hello = "world";
console.log(hello);
```

## Test Note - Enhanced Mode
<!-- id: note_test_2 | created: 2026-01-02T10:00:00.000Z | updated: 2026-01-02T10:00:00.000Z | rev: 1 -->

Testing enhanced note features.

<!-- Custom Section: Tabbed Content -->
<!-- section-id: section_test_tabs, type: tabs -->

### Tab: Overview
<!-- tab-id: tab_overview -->

This is the overview tab content.

### Tab: Details
<!-- tab-id: tab_details -->

This is the details tab with more information.

```typescript
interface TestInterface {
  name: string;
  value: number;
}
```

### Tab: Code Examples
<!-- tab-id: tab_code -->

```python
def hello_world():
    print("Hello, World!")
```

<!-- End Custom Section -->


<!-- Custom Section: Project Timeline -->
<!-- section-id: section_test_timeline, type: timeline -->

## Phase 1: Planning (success)
<!-- item-id: timeline_phase1, status: success, date: 2026-01-15 -->

Initial planning and requirements gathering.

## Phase 2: Development (in-progress)
<!-- item-id: timeline_phase2, status: in-progress, date: 2026-02-01 -->

Active development phase.

## Phase 3: Testing (pending)
<!-- item-id: timeline_phase3, status: pending, date: 2026-03-01 -->

QA and testing phase.

## Phase 4: Release (pending)
<!-- item-id: timeline_phase4, status: pending, date: 2026-04-01 -->

Production release.

<!-- End Custom Section -->


<!-- Custom Section: Split View Test -->
<!-- section-id: section_test_split, type: split-view -->

### Column 1
<!-- column-index: 0 -->

Left column content with some **bold** and *italic* text.

### Column 2
<!-- column-index: 1 -->

Right column content with a list:
- Item A
- Item B
- Item C

<!-- End Custom Section -->

<!-- Goals -->
# Goals

## Launch MVP {type: project; kpi: Release v1.0; start: 2026-01-01; end: 2026-06-30; status: on-track}
<!-- id: goal_1 -->

Launch the minimum viable product with core features.

## 1000 Active Users {type: enterprise; kpi: 1000 MAU; start: 2026-03-01; end: 2026-12-31; status: planning}
<!-- id: goal_2 -->

Achieve 1000 monthly active users by end of year.

## Revenue Target {type: enterprise; kpi: $100k ARR; start: 2026-06-01; end: 2026-12-31; status: planning}
<!-- id: goal_3 -->

Reach $100,000 annual recurring revenue.

<!-- Milestones -->
# Milestones

## Alpha Release {date: 2026-02-15; status: completed}
<!-- id: milestone_1 -->

First internal alpha release for testing.

## Beta Release {date: 2026-03-15; status: in-progress}
<!-- id: milestone_2 -->

Public beta release with feedback collection.

## v1.0 Release {date: 2026-06-01; status: planned}
<!-- id: milestone_3 -->

Official v1.0 production release.

## Enterprise Features {date: 2026-09-01; status: planned}
<!-- id: milestone_4 -->

Enterprise tier features release.

<!-- Ideas -->
# Ideas

## Dark Mode Improvements {status: approved}
<!-- id: idea_1 -->

Enhance dark mode with better contrast and custom accent colors.

## Mobile App {status: considering}
<!-- id: idea_2 -->

Native mobile app for iOS and Android.

## AI Integration {status: approved}
<!-- id: idea_3 -->

Integrate AI for task suggestions and auto-categorization.

## Plugin System {status: considering}
<!-- id: idea_4 -->

Allow third-party plugins for extensibility.

<!-- Retrospectives -->
# Retrospectives

## Sprint 1 Retro {date: 2026-01-31}
<!-- id: retro_1 -->

### Went Well
- Fast initial setup
- Good team collaboration
- Clear requirements

### To Improve
- Better testing coverage
- More documentation
- Earlier code reviews

### Action Items
- Set up CI/CD pipeline
- Create onboarding docs
- Implement code review checklist

## Sprint 2 Retro {date: 2026-02-14}
<!-- id: retro_2 -->

### Went Well
- CI/CD pipeline working
- Improved code quality
- Better communication

### To Improve
- Performance optimization
- Error handling
- User feedback integration

### Action Items
- Profile and optimize slow queries
- Add error boundaries
- Create feedback widget

<!-- SWOT Analysis -->
# SWOT Analysis

## Product Launch SWOT
<!-- id: swot_1 -->

### Strengths
- Modern tech stack
- Fast performance
- Clean UI design
- Markdown-based storage

### Weaknesses
- Limited integrations
- No mobile app yet
- Small user base
- Documentation gaps

### Opportunities
- Growing market demand
- Remote work trends
- Open source community
- Enterprise market

### Threats
- Established competitors
- Rapid tech changes
- Economic uncertainty
- Data privacy regulations

<!-- Risk Analysis -->
# Risk Analysis

## Project Risks
<!-- id: risk_1 -->

### High Likelihood, High Impact
- Scope creep affecting timeline
- Key developer leaving team

### High Likelihood, Low Impact
- Minor bugs in release
- Documentation delays

### Low Likelihood, High Impact
- Security breach
- Server infrastructure failure

### Low Likelihood, Low Impact
- Third-party API changes
- Minor UI inconsistencies

<!-- Lean Canvas -->
# Lean Canvas

## MD Planner Lean Canvas
<!-- id: lean_1 -->

### Problem
- Complex project management tools
- Data lock-in with proprietary formats
- Expensive enterprise solutions

### Solution
- Simple markdown-based task management
- Open file format, no lock-in
- Self-hosted or cloud options

### Key Metrics
- Monthly active users
- Task completion rate
- User retention

### Unique Value Proposition
- Your data stays yours in plain markdown
- Fast, keyboard-driven interface

### Unfair Advantage
- First markdown-native task manager
- Developer-focused features

### Channels
- GitHub community
- Dev.to articles
- Product Hunt launch

### Customer Segments
- Individual developers
- Small tech teams
- Open source maintainers

### Cost Structure
- Server infrastructure
- Development team
- Marketing

### Revenue Streams
- Premium features subscription
- Enterprise licensing
- Support contracts

<!-- Business Model -->
# Business Model

## SaaS Business Model
<!-- id: bm_1 -->

### Key Partners
- Cloud providers (AWS, GCP)
- Integration partners
- Developer communities

### Key Activities
- Product development
- Customer support
- Marketing and sales

### Key Resources
- Development team
- Cloud infrastructure
- Intellectual property

### Value Propositions
- Simplicity and speed
- Data ownership
- Developer experience

### Customer Relationships
- Self-service
- Community support
- Premium support tier

### Channels
- Website
- GitHub
- Social media

### Customer Segments
- Developers
- Small teams
- Enterprises

### Cost Structure
- Development costs
- Infrastructure costs
- Marketing costs

### Revenue Streams
- Subscriptions
- Enterprise licenses
- Consulting

<!-- Project Value -->
# Project Value

## Value Assessment Q1
<!-- id: pv_1 -->

### Value Delivered
- Core task management features
- Clean user interface
- Fast performance
- Markdown storage

### Value Expected
- Team collaboration
- Integrations
- Mobile support

### Value Destroyed
- Initial bugs
- Learning curve
- Limited documentation

### Value Potential
- AI features
- Plugin ecosystem
- Enterprise market

<!-- Brief -->
# Brief

## Product Brief Q2
<!-- id: brief_1 -->

### Objective
Launch v1.0 with complete feature set

### Background
Project has been in development for 6 months with positive beta feedback

### Target Audience
Developers and small technical teams

### Requirements
- Stable core features
- Good documentation
- Support channels ready

### Success Criteria
- Zero critical bugs at launch
- 100 new signups first week
- 4.5+ rating in reviews

### Timeline
Launch by end of Q2 2026

<!-- Time Tracking -->
# Time Tracking

## Entry {task_id: 1; date: 2026-02-10; duration: 2.5; description: Backend API implementation}
<!-- id: time_1 -->

## Entry {task_id: 1; date: 2026-02-11; duration: 3.0; description: API testing and fixes}
<!-- id: time_2 -->

## Entry {task_id: 4; date: 2026-02-12; duration: 1.5; description: UI improvements}
<!-- id: time_3 -->

## Entry {task_id: 2; date: 2026-02-13; duration: 4.0; description: Documentation writing}
<!-- id: time_4 -->

<!-- Capacity Planning -->
# Capacity Planning

## Q1 2026 Capacity
<!-- id: capacity_1 -->

### Team Members
- Alice {role: Frontend; hours_per_week: 40}
- Bob {role: Backend; hours_per_week: 40}
- Charlie {role: DevOps; hours_per_week: 20}

### Allocations
- Week 2026-01-06: Alice 32h Feature A, Bob 40h API, Charlie 16h Infra
- Week 2026-01-13: Alice 40h Feature B, Bob 32h Testing, Charlie 20h Deploy

<!-- Strategic Levels -->
# Strategic Levels

## Company Strategy
<!-- id: strategic_1 -->

### Vision
Become the leading markdown-based productivity tool

### Mission
Empower developers with simple, powerful task management

### Strategic Objectives
- Achieve product-market fit by Q2
- Build sustainable revenue by Q4
- Expand to enterprise by next year

### Key Results
- 1000 active users
- $50k MRR
- 10 enterprise customers

### Initiatives
- Launch marketing campaign
- Build integration ecosystem
- Develop enterprise features

### Projects
- v1.0 Release
- Integration Framework
- Enterprise Admin Panel

<!-- Billing -->
# Billing

## Customers
- Acme Corp {email: billing@acme.com; company: Acme Corporation}
<!-- id: customer_1 -->
- TechStart Inc {email: accounts@techstart.io; company: TechStart Inc}
<!-- id: customer_2 -->

## Rates
- Development {rate: 150; unit: hour}
<!-- id: rate_1 -->
- Consulting {rate: 200; unit: hour}
<!-- id: rate_2 -->
- Support {rate: 100; unit: hour}
<!-- id: rate_3 -->

## Quotes
- Quote Q2026-001 {customer: customer_1; date: 2026-01-15; status: accepted; total: 5000}
<!-- id: quote_1 -->

## Invoices
- Invoice INV-2026-001 {customer: customer_1; date: 2026-02-01; due_date: 2026-03-01; status: paid; total: 5000}
<!-- id: invoice_1 -->

<!-- Canvas -->
# Canvas

## Todo {color: yellow; position: {x: 100, y: 100}; size: {width: 200, height: 150}}
<!-- id: sticky_1 -->
Items to complete today

## In Progress {color: blue; position: {x: 350, y: 100}; size: {width: 200, height: 150}}
<!-- id: sticky_2 -->
Currently working on

## Done {color: green; position: {x: 600, y: 100}; size: {width: 200, height: 150}}
<!-- id: sticky_3 -->
Completed items

## Blocked {color: pink; position: {x: 100, y: 300}; size: {width: 200, height: 150}}
<!-- id: sticky_4 -->
Waiting for external input

## Ideas {color: purple; position: {x: 350, y: 300}; size: {width: 200, height: 150}}
<!-- id: sticky_5 -->
Future improvements

<!-- Mindmap -->
# Mindmap

## Product Roadmap
<!-- id: mindmap_1 -->

- MD Planner
  - Core Features
    - Task Management
    - Notes
    - Goals
  - Views
    - List View
    - Board View
    - Timeline View
  - Integrations
    - GitHub
    - Slack
    - Calendar
  - Enterprise
    - SSO
    - Audit Logs
    - Admin Panel

## Architecture Overview
<!-- id: mindmap_2 -->

- System
  - Frontend
    - HTML/CSS/JS
    - Tailwind CSS
    - Vanilla JS Modules
  - Backend
    - Deno Runtime
    - Hono Framework
    - Markdown Parser
  - Storage
    - Markdown Files
    - Backups
    - Version Control

<!-- C4 Architecture -->
# C4 Architecture

## User {level: context; type: Person; position: {x: 100, y: 200}}
<!-- id: c4_1 -->
End user accessing the application

## MD Planner {level: context; type: System; position: {x: 400, y: 200}; connections: [{target: User, label: Uses}]}
<!-- id: c4_2 -->
Main application system

## File System {level: context; type: ExternalSystem; position: {x: 700, y: 200}; connections: [{target: MD Planner, label: Stores data}]}
<!-- id: c4_3 -->
Local file storage for markdown files

## Web Server {level: container; type: Container; position: {x: 200, y: 100}; parent: c4_2}
<!-- id: c4_4 -->
Hono-based web server

## Static Files {level: container; type: Container; position: {x: 400, y: 100}; parent: c4_2}
<!-- id: c4_5 -->
HTML, CSS, JS assets

## Markdown Parser {level: container; type: Container; position: {x: 600, y: 100}; parent: c4_2}
<!-- id: c4_6 -->
Parser for markdown file handling

## API Handler {level: component; type: Component; position: {x: 100, y: 100}; parent: c4_4}
<!-- id: c4_7 -->
REST API endpoint handlers

## Route Controller {level: component; type: Component; position: {x: 300, y: 100}; parent: c4_4}
<!-- id: c4_8 -->
Request routing logic

<!-- Board -->
# Board

## Backlog

- [ ] (backlog1) Setup project documentation {tag: [Documentation]; priority: 2; effort: 3}
  Create comprehensive documentation for the project
- [ ] (backlog2) Add unit tests {tag: [Testing]; priority: 2; effort: 5}
  Implement unit test coverage for core modules
- [ ] (backlog3) Performance optimization {tag: [Backend]; priority: 3; effort: 8}
  Profile and optimize slow operations

## Todo

- [ ] (todo1) Implement sidenav component {tag: [Frontend, Feature]; due_date: 2026-02-20; assignee: Alice; priority: 1; effort: 5; milestone: Beta Release}
  Replace modals with Asana-style sidenav panels
- [ ] (todo2) Extract CSS to files {tag: [Frontend, Infrastructure]; due_date: 2026-02-18; assignee: Alice; priority: 1; effort: 3; milestone: Beta Release}
  Move inline CSS to external themed files
- [ ] (todo3) Setup Hono SSR {tag: [Backend, Infrastructure]; due_date: 2026-02-22; assignee: Bob; priority: 1; effort: 5; milestone: Beta Release}
  Configure server-side rendering with Hono

## In Progress

- [ ] (prog1) Migrate app.js to modules {tag: [Frontend]; due_date: 2026-02-15; assignee: Alice; priority: 1; effort: 8; milestone: Alpha Release}
  Split monolithic app.js into ES6 modules
  - [x] (prog1a) Extract constants {tag: [Frontend]; priority: 1}
  - [x] (prog1b) Extract utilities {tag: [Frontend]; priority: 1}
  - [ ] (prog1c) Extract API layer {tag: [Frontend]; priority: 1}
- [ ] (prog2) Fix dark mode issues {tag: [Frontend, Bug]; due_date: 2026-02-14; assignee: Charlie; priority: 2; effort: 2}
  Ensure all components render correctly in dark mode

## Review

- [ ] (rev1) Code review: Auth module {tag: [Security, Backend]; assignee: Bob; priority: 1; effort: 2}
  Review authentication implementation
- [ ] (rev2) Design review: Dashboard {tag: [Frontend]; assignee: Diana; priority: 2; effort: 1}
  Review dashboard UI/UX design

## Done

- [x] (done1) Initial project setup {tag: [Infrastructure]; assignee: Bob; priority: 1; effort: 2; milestone: Alpha Release}
  Project scaffolding and dependencies
- [x] (done2) Basic task CRUD {tag: [Backend, Frontend]; assignee: Alice; priority: 1; effort: 5; milestone: Alpha Release}
  Create, read, update, delete tasks
- [x] (done3) Markdown parser {tag: [Backend]; assignee: Bob; priority: 1; effort: 8; milestone: Alpha Release}
  Parse and save markdown files
- [x] (done4) Theme toggle {tag: [Frontend]; assignee: Charlie; priority: 2; effort: 1}
  Dark/light mode switching

