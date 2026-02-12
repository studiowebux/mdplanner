# MD Planner

Markdown powered task manager tool.

<!-- Configurations -->
# Configurations

Start Date: 2025-08-17
Working Days: 7
Last Updated: 2026-02-12T05:45:11.021Z

Assignees:
- Alice
- Bob
- Jane Doe
- John Doe

Tags:
- Backend
- Bug
- Database
- Frontend
- Infrastructure

Links:
- [studiowebux.com](https://studiowebux.com)

<!-- Notes -->
# Notes

## Is it trully cleaner ?

<!-- id: note_1 | created: 2026-01-24T22:32:14.524Z | updated: 2026-01-24T22:32:14.524Z | rev: 1 -->
# Section Title


<!-- Custom Section: Split it ! -->
<!-- section-id: section_1755493406125_ls760tkkt, type: split-view -->

### Column 1
<!-- column-index: 0 -->

Hello

### Column 2
<!-- column-index: 1 -->

World

<!-- End Custom Section -->


<!-- Custom Section: title -->
<!-- section-id: section_1755523588942_8xsq0hznc, type: tabs -->

### Tab: Tab 1
<!-- tab-id: tab_1755523588942_6wcr3rv41 -->

Enter your text here

```javascript
// Enter your code here
```

### Tab: Tab 2
<!-- tab-id: tab_1755523588942_2mqc5h1x3 -->

```javascript
// Enter your code here
```

Enter your text here

```javascript
// Enter your code here
```

### Tab: Tab 3
<!-- tab-id: tab_1755523600721_i9ldpxdd9 -->

Enter your text here

<!-- End Custom Section -->


<!-- Custom Section: timeline -->
<!-- section-id: section_1755523649458_en7kppghl, type: timeline -->

## Initial Step (pending)
<!-- item-id: timeline_1755523649458_rxasn3o3x, status: pending, date: 2025-08-18 -->

Enter your text here

## New Step (success)
<!-- item-id: timeline_1755523675841_2a65xzanx, status: success, date: 2025-08-18 -->

Enter your text here

<!-- End Custom Section -->

<!-- Goals -->
# Goals

## 100 MAU {type: project; kpi: onboard 100 MAU; start: 2025-08-17; end: 2026-01-01; status: planning}

<!-- id: goal_1 -->

## Maintenance plan and new release weekly {type: enterprise; kpi: Release every weeks; start: 2025-08-17; end: 2025-12-01; status: on-track}

<!-- id: goal_2 -->


<!-- Canvas -->
# Canvas

## Sticky note {color: yellow; position: {x: 158, y: 100}; size: {width: 150, height: 100}}

<!-- id: sticky_note_1 -->
Todos
## Sticky note {color: yellow; position: {x: 453, y: 103}; size: {width: 150, height: 100}}

<!-- id: sticky_note_2 -->
On Going
## Sticky note {color: green; position: {x: 763, y: 92}; size: {width: 150, height: 100}}

<!-- id: sticky_note_3 -->
Done
## Sticky note {color: purple; position: {x: 161, y: 260}; size: {width: 760, height: 124}}

<!-- id: sticky_note_4 -->
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
<!-- Mindmap -->
# Mindmap

## Test Mindmap

<!-- id: mindmap_1 -->

- Main
  - Sub Level
    - Level 2
  - Sub Level #2
  - Edit mindmap
    - Awesome !

## Family tree

<!-- id: mindmap_2 -->

- Main
  - Children
    - John Doe
    - Jane Doe

<!-- C4 Architecture -->
# C4 Architecture

## Context 1 {level: context; type: System; position: {x: 263, y: 243}}

<!-- id: c4_component_1 -->


## Context 2 {level: context; type: System; position: {x: 536, y: 172}; connections: [{target: Context 1, label: Intertwined}]}

<!-- id: c4_component_2 -->


## Container 1 {level: container; type: Container; position: {x: 31, y: 304}; parent: c4_component_1}

<!-- id: c4_component_3 -->


## Component 1 {level: component; type: Component; position: {x: 100, y: 100}; parent: c4_component_3}

<!-- id: c4_component_4 -->


## Component 2 {level: component; type: Component; position: {x: 121, y: 275}; parent: c4_component_3}

<!-- id: c4_component_5 -->


<!-- SWOT Analysis -->
# SWOT Analysis

## MD Planner Product
<!-- id: swot_001 -->
Date: 2026-02-12

### Strengths
- Single markdown file storage
- No database required
- Human-readable data format
- Lightweight and portable
- Full offline capability

### Weaknesses
- Limited concurrent user support
- No real-time collaboration
- File-based storage limits scalability

### Opportunities
- Obsidian plugin integration
- SQLite backend option
- Team collaboration features
- Mobile app development

### Threats
- Established competitors (Notion, Linear)
- Users preferring cloud-based solutions
- Markdown format limitations for complex data

<!-- Risk Analysis -->
# Risk Analysis

## test
<!-- id: dbdc2be8 -->
Date: 2026-02-12

### High Impact / High Probability

### High Impact / Low Probability

### Low Impact / High Probability
- breaking the code

### Low Impact / Low Probability


# Board

## Todo

- [ ] (demo1) Demo Task {tag: [Frontend]; due_date: 2025-08-20; assignee: Demo User; priority: 1; effort: 2; milestone: Demo}
  This task demonstrates the working export and import functionality
- [ ] (import1) Imported Task 1 {tag: [Backend, API]; due_date: 2025-08-22; assignee: Test User; priority: 1; effort: 3; milestone: Sprint 1}
  This is an imported test task
- [ ] (import2) Imported Task 2 {tag: [Frontend]; due_date: 2025-08-25; assignee: Demo User; priority: 2; effort: 1; milestone: Sprint 1}
  Another imported task
  - [ ] (2) Child Task #1 {tag: [Bug]; assignee: Bob; priority: 2}

## In Progress

- [ ] (1) backup {tag: [Backend]; due_date: 2025-08-27T13; assignee: Jane Doe; priority: 2}
- [ ] (test1) Simple Test Task {tag: [Test]; due_date: 2025-08-22; assignee: Test User; priority: 1; effort: 1; milestone: Test}
  Test description

## Done

- [ ] (3) Almost ready ! {tag: [Bug]; assignee: Bob; priority: 1}

