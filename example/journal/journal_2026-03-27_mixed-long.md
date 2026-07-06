---
id: journal_2026-03-27_mixed-long
title: A longer mixed entry
date: 2026-03-27
mood: neutral
tags: [retrospective, week]
created_at: "2026-03-27T18:15:00.000Z"
updated_at: "2026-03-27T18:15:00.000Z"
---

# Week in review

A mixed week — worth writing down properly while it is fresh.

## Highlights

- The edit-mode pattern landed on journal as the reference.
- Tests cover the content save path end to end.

## Lowlights

1. Too much back-and-forth early on.
2. A commit got rejected because I moved before confirming.

## A note to self

> Confirm the pattern once. Then build the whole thing.

Code that made the difference:

```ts
const formFields = isEdit && inline?.length
  ? cfg.fields.filter((f) => f.type === "hidden" || !inline.includes(f.name))
  : cfg.fields;
```

## Next week

| Day | Focus                     |
| --- | ------------------------- |
| Mon | roll out to risk + brief  |
| Tue | finance + retrospective   |
| Wed | docs sync                 |

---

Closing the laptop. `deno task test` is green.
