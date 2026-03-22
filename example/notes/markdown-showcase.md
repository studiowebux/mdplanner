---
id: note_markdown_showcase
created: "2026-03-21T22:30:00Z"
updated: "2026-03-21T22:30:00Z"
revision: 1
mode: enhanced
---

# Markdown Showcase

Testing full GFM support and edge cases.

## Links

- Inline link: [MDPlanner GitHub](https://github.com/studiowebux/mdplanner)
- Auto-link: https://example.com
- Link with title: [Docs](https://docs.example.com "Official Documentation")
- Email: contact@example.com

## Images

![Octocat](https://github.githubassets.com/images/icons/emoji/octocat.png)

## Text Formatting

**Bold text** and __also bold__

*Italic text* and _also italic_

***Bold and italic*** and ___also both___

~~Strikethrough text~~

`inline code` and more `inline code here`

> Blockquote with **bold** and *italic*
>
> Multiple paragraphs in a blockquote
>
> > Nested blockquote

## Lists

### Unordered
- Item one
- Item two
  - Nested item
  - Another nested
    - Deep nested
- Item three

### Ordered
1. First
2. Second
   1. Sub-item
   2. Sub-item
3. Third

### Task List (GFM)
- [x] Completed task
- [ ] Incomplete task
- [x] Another done
- [ ] Still todo

## Tables (GFM)

| Feature | Status | Priority |
|---------|--------|----------|
| Notes | Done | P1 |
| Tasks | Done | P1 |
| Timeline | Done | P2 |
| Drag-drop | Todo | P3 |

### Aligned Table

| Left | Center | Right |
|:-----|:------:|------:|
| L1 | C1 | R1 |
| L2 | C2 | R2 |
| L3 | C3 | R3 |

## Horizontal Rules

---

***

## HTML Entities

&copy; 2026 Studio Webux &mdash; All rights reserved &trade;

## Escapes

\*not italic\* and \`not code\` and \[not a link\]

## Long Code Block (scroll test)

```typescript
interface TaskRepository {
  findAll(): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  create(data: CreateTask): Promise<Task>;
  update(id: string, data: UpdateTask): Promise<Task | null>;
  delete(id: string): Promise<boolean>;
}

// This is a very long line that should trigger horizontal scrolling in the code block to verify overflow-x auto works correctly on narrow viewports
const reallyLongVariableName = "This string is intentionally very long to test horizontal scrolling behavior in code blocks";
```

## Mixed Content

Here is a paragraph with `inline code`, a [link](https://example.com), and **bold text** all together. Below is a table followed by a code block:

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/notes | List all notes |
| POST | /api/v1/notes | Create a note |
| PUT | /api/v1/notes/:id | Update a note |
| DELETE | /api/v1/notes/:id | Delete a note |

```bash
curl -s "http://localhost:8003/api/v1/notes" | jq '.[] | .title'
```
