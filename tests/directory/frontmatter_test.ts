/**
 * Unit tests for YAML frontmatter parser.
 */
import { assertEquals, assertObjectMatch } from "@std/assert";
import {
  buildFileContent,
  parseFrontmatter,
  serializeFrontmatter,
} from "../../src/lib/parser/directory/frontmatter.ts";

// === parseFrontmatter tests ===

Deno.test("parseFrontmatter - parses simple key-value pairs", () => {
  const content = `---
id: test_123
title: My Note
revision: 5
---

# Content here`;

  const result = parseFrontmatter<{
    id: string;
    title: string;
    revision: number;
  }>(content);

  assertEquals(result.frontmatter.id, "test_123");
  assertEquals(result.frontmatter.title, "My Note");
  assertEquals(result.frontmatter.revision, 5);
  assertEquals(result.content, "# Content here");
});

Deno.test("parseFrontmatter - parses boolean values", () => {
  const content = `---
completed: true
active: false
---

Body`;

  const result = parseFrontmatter<{ completed: boolean; active: boolean }>(
    content,
  );

  assertEquals(result.frontmatter.completed, true);
  assertEquals(result.frontmatter.active, false);
});

Deno.test("parseFrontmatter - parses null values", () => {
  const content = `---
value1: null
value2: ~
---

Body`;

  const result = parseFrontmatter<{ value1: null; value2: null }>(content);

  assertEquals(result.frontmatter.value1, null);
  assertEquals(result.frontmatter.value2, null);
});

Deno.test("parseFrontmatter - parses inline arrays", () => {
  const content = `---
tags: [bug, urgent, frontend]
numbers: [1, 2, 3]
---

Body`;

  const result = parseFrontmatter<{ tags: string[]; numbers: number[] }>(
    content,
  );

  assertEquals(result.frontmatter.tags, ["bug", "urgent", "frontend"]);
  assertEquals(result.frontmatter.numbers, [1, 2, 3]);
});

Deno.test("parseFrontmatter - parses multiline arrays", () => {
  const content = `---
tags:
- feature
- enhancement
- v2
---

Body`;

  const result = parseFrontmatter<{ tags: string[] }>(content);

  assertEquals(result.frontmatter.tags, ["feature", "enhancement", "v2"]);
});

Deno.test("parseFrontmatter - parses inline objects", () => {
  const content = `---
position: {x: 100, y: 200}
size: {width: 300, height: 150}
---

Body`;

  const result = parseFrontmatter<{
    position: { x: number; y: number };
    size: { width: number; height: number };
  }>(content);

  assertObjectMatch(result.frontmatter.position, { x: 100, y: 200 });
  assertObjectMatch(result.frontmatter.size, { width: 300, height: 150 });
});

Deno.test("parseFrontmatter - parses quoted strings", () => {
  const content = `---
title: "My Title: With Colon"
name: 'Single Quoted'
---

Body`;

  const result = parseFrontmatter<{ title: string; name: string }>(content);

  assertEquals(result.frontmatter.title, "My Title: With Colon");
  assertEquals(result.frontmatter.name, "Single Quoted");
});

Deno.test("parseFrontmatter - returns empty frontmatter when no delimiter", () => {
  const content = `# Just Content

No frontmatter here`;

  const result = parseFrontmatter(content);

  assertEquals(result.frontmatter, {});
  assertEquals(result.content, content);
});

Deno.test("parseFrontmatter - returns empty frontmatter when no closing delimiter", () => {
  const content = `---
id: broken
title: incomplete`;

  const result = parseFrontmatter(content);

  assertEquals(result.frontmatter, {});
  assertEquals(result.content, content);
});

Deno.test("parseFrontmatter - handles empty content after frontmatter", () => {
  const content = `---
id: test
---`;

  const result = parseFrontmatter<{ id: string }>(content);

  assertEquals(result.frontmatter.id, "test");
  assertEquals(result.content, "");
});

Deno.test("parseFrontmatter - parses numeric strings correctly", () => {
  const content = `---
version: "1.0.0"
port: 3000
---

Body`;

  const result = parseFrontmatter<{ version: string; port: number }>(content);

  assertEquals(result.frontmatter.version, "1.0.0");
  assertEquals(result.frontmatter.port, 3000);
});

// === serializeFrontmatter tests ===

Deno.test("serializeFrontmatter - serializes simple values", () => {
  const data = {
    id: "test_123",
    title: "My Title",
    revision: 1,
    completed: false,
  };

  const result = serializeFrontmatter(data);

  assertEquals(
    result,
    `---
id: test_123
title: My Title
revision: 1
completed: false
---`,
  );
});

Deno.test("serializeFrontmatter - serializes null values", () => {
  const data = {
    id: "test",
    value: null,
  };

  const result = serializeFrontmatter(data);

  assertEquals(
    result,
    `---
id: test
value: null
---`,
  );
});

Deno.test("serializeFrontmatter - serializes arrays inline", () => {
  const data = {
    tags: ["bug", "urgent"],
    numbers: [1, 2, 3],
  };

  const result = serializeFrontmatter(data);

  assertEquals(
    result,
    `---
tags: [bug, urgent]
numbers: [1, 2, 3]
---`,
  );
});

Deno.test("serializeFrontmatter - serializes empty arrays", () => {
  const data = {
    id: "test",
    tags: [],
  };

  const result = serializeFrontmatter(data);

  assertEquals(
    result,
    `---
id: test
tags: []
---`,
  );
});

Deno.test("serializeFrontmatter - serializes small objects inline", () => {
  const data = {
    position: { x: 100, y: 200 },
  };

  const result = serializeFrontmatter(data);

  assertEquals(
    result,
    `---
position: {x: 100, y: 200}
---`,
  );
});

Deno.test("serializeFrontmatter - quotes strings with special chars", () => {
  const data = {
    title: "Has: colon",
    comment: "Has # hash",
  };

  const result = serializeFrontmatter(data);

  assertEquals(
    result,
    `---
title: "Has: colon"
comment: "Has # hash"
---`,
  );
});

Deno.test("serializeFrontmatter - quotes boolean-like strings", () => {
  const data = {
    status: "true",
    flag: "false",
  };

  const result = serializeFrontmatter(data);

  assertEquals(
    result,
    `---
status: "true"
flag: "false"
---`,
  );
});

Deno.test("serializeFrontmatter - skips undefined values", () => {
  const data = {
    id: "test",
    optional: undefined,
    title: "Title",
  };

  const result = serializeFrontmatter(data);

  assertEquals(
    result,
    `---
id: test
title: Title
---`,
  );
});

// === buildFileContent tests ===

Deno.test("buildFileContent - combines frontmatter and body", () => {
  const frontmatter = {
    id: "note_1",
    revision: 1,
  };
  const body = `# My Note

This is the content.`;

  const result = buildFileContent(frontmatter, body);

  assertEquals(
    result,
    `---
id: note_1
revision: 1
---

# My Note

This is the content.`,
  );
});

Deno.test("buildFileContent - handles empty body", () => {
  const frontmatter = { id: "test" };
  const body = "";

  const result = buildFileContent(frontmatter, body);

  assertEquals(
    result,
    `---
id: test
---

`,
  );
});

// === Round-trip tests ===

Deno.test("round-trip - preserves data through serialize/parse cycle", () => {
  const original = {
    id: "task_123",
    completed: true,
    priority: 3,
    tags: ["bug", "urgent"],
    position: { x: 50, y: 100 },
  };

  const serialized = serializeFrontmatter(original);
  const parsed = parseFrontmatter<typeof original>(serialized + "\n\nBody");

  assertEquals(parsed.frontmatter.id, original.id);
  assertEquals(parsed.frontmatter.completed, original.completed);
  assertEquals(parsed.frontmatter.priority, original.priority);
  assertEquals(parsed.frontmatter.tags, original.tags);
  assertObjectMatch(
    parsed.frontmatter.position as Record<string, unknown>,
    original.position,
  );
});

Deno.test("round-trip - preserves task config structure", () => {
  const taskFrontmatter = {
    id: "task_001",
    completed: false,
    tag: ["feature", "backend"],
    due_date: "2026-03-01",
    assignee: "alice",
    priority: 2,
    effort: 8,
    milestone: "v1.0",
  };

  const content = buildFileContent(
    taskFrontmatter,
    "# Task Title\n\nDescription here",
  );
  const parsed = parseFrontmatter<typeof taskFrontmatter>(content);

  assertEquals(parsed.frontmatter.id, taskFrontmatter.id);
  assertEquals(parsed.frontmatter.completed, taskFrontmatter.completed);
  assertEquals(parsed.frontmatter.tag, taskFrontmatter.tag);
  assertEquals(parsed.frontmatter.due_date, taskFrontmatter.due_date);
  assertEquals(parsed.frontmatter.assignee, taskFrontmatter.assignee);
  assertEquals(parsed.frontmatter.priority, taskFrontmatter.priority);
  assertEquals(parsed.frontmatter.effort, taskFrontmatter.effort);
  assertEquals(parsed.frontmatter.milestone, taskFrontmatter.milestone);
  assertEquals(parsed.content, "# Task Title\n\nDescription here");
});

Deno.test("round-trip - preserves note frontmatter structure", () => {
  const noteFrontmatter = {
    id: "note_001",
    created: "2026-01-15T10:30:00Z",
    updated: "2026-02-01T14:45:00Z",
    revision: 5,
    mode: "enhanced" as const,
  };

  const content = buildFileContent(
    noteFrontmatter,
    "# Note Title\n\nNote content",
  );
  const parsed = parseFrontmatter<typeof noteFrontmatter>(content);

  assertEquals(parsed.frontmatter.id, noteFrontmatter.id);
  assertEquals(parsed.frontmatter.created, noteFrontmatter.created);
  assertEquals(parsed.frontmatter.updated, noteFrontmatter.updated);
  assertEquals(parsed.frontmatter.revision, noteFrontmatter.revision);
  assertEquals(parsed.frontmatter.mode, noteFrontmatter.mode);
});

// === Arrays of Objects ===

Deno.test("parseFrontmatter - parses multiline arrays of objects", () => {
  const content = `---
links:
  - title: Repository
    url: https://github.com/example
  - title: Documentation
    url: https://docs.example.com
---

Body`;

  const result = parseFrontmatter<{
    links: { title: string; url: string }[];
  }>(content);

  assertEquals(result.frontmatter.links.length, 2);
  assertEquals(result.frontmatter.links[0].title, "Repository");
  assertEquals(result.frontmatter.links[0].url, "https://github.com/example");
  assertEquals(result.frontmatter.links[1].title, "Documentation");
  assertEquals(result.frontmatter.links[1].url, "https://docs.example.com");
});

Deno.test("parseFrontmatter - parses mixed array items", () => {
  const content = `---
items:
  - simple value
  - another value
---

Body`;

  const result = parseFrontmatter<{ items: string[] }>(content);

  assertEquals(result.frontmatter.items.length, 2);
  assertEquals(result.frontmatter.items[0], "simple value");
  assertEquals(result.frontmatter.items[1], "another value");
});
