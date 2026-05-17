---
id: journal_2026-03-09_code-blocks
title: Fenced code blocks
date: 2026-03-09
mood: good
tags: [code, deno]
created_at: "2026-03-09T22:18:00.000Z"
updated_at: "2026-03-09T22:18:00.000Z"
---

The dirty check is small enough to read in one sitting:

```js
function textOf(el) {
  return (el.innerText || "").replace(NBSP, " ").replace(/\r/g, "").trim();
}
```

Ran the suite to confirm nothing regressed:

```bash
deno test --allow-read --allow-write --allow-env tests/
```

Two languages, two fences — checks the highlighter and the round-trip together.
