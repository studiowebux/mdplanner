---
id: journal_2026-03-07_ordered-list
title: Ordered steps
date: 2026-03-07
mood: neutral
tags: [process]
created_at: "2026-03-07T11:05:00.000Z"
updated_at: "2026-03-07T11:05:00.000Z"
---

Edit Mode save flow, start to finish:

1. Click **Edit Mode** on the detail page.
2. The content body becomes contenteditable.
3. Type — dirty detection runs on every keystroke.
4. The Save button appears once the text differs from the original.
5. Click Save; htmx persists the change.
6. The page re-renders, still in edit mode.

No auto-save anywhere in that list — that is the point.
