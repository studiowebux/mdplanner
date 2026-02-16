/**
 * Schema initialization tests
 */

import { assertEquals } from "@std/assert";
import { CacheDatabase } from "../../src/lib/cache/database.ts";
import { dropSchema, initSchema } from "../../src/lib/cache/schema.ts";

const TEST_DB = ":memory:";

const EXPECTED_TABLES = [
  "tasks",
  "notes",
  "goals",
  "milestones",
  "ideas",
  "retrospectives",
  "sticky_notes",
  "mindmaps",
  "c4_components",
  "swot",
  "risk",
  "lean_canvas",
  "business_model",
  "project_value",
  "brief",
  "capacity_plans",
  "strategic_builders",
  "customers",
  "rates",
  "quotes",
  "invoices",
  "companies",
  "contacts",
  "deals",
  "interactions",
  "portfolio",
  "org_members",
  "cache_meta",
];

const FTS_TABLES = [
  "tasks_fts",
  "notes_fts",
  "goals_fts",
  "ideas_fts",
];

Deno.test("initSchema - creates all entity tables", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  for (const table of EXPECTED_TABLES) {
    assertEquals(db.tableExists(table), true, `Table ${table} should exist`);
  }

  db.close();
});

Deno.test("initSchema - creates FTS tables", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  for (const table of FTS_TABLES) {
    const result = db.queryOne<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [table],
    );
    assertEquals(result !== null, true, `FTS table ${table} should exist`);
  }

  db.close();
});

Deno.test("initSchema - is idempotent", () => {
  const db = new CacheDatabase(TEST_DB);

  // Initialize twice
  initSchema(db);
  initSchema(db);

  // Should still work
  for (const table of EXPECTED_TABLES) {
    assertEquals(db.tableExists(table), true);
  }

  db.close();
});

Deno.test("dropSchema - removes all tables", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  // Verify tables exist
  assertEquals(db.tableExists("tasks"), true);
  assertEquals(db.tableExists("notes"), true);

  dropSchema(db);

  // Verify tables are gone
  assertEquals(db.tableExists("tasks"), false);
  assertEquals(db.tableExists("notes"), false);

  db.close();
});

Deno.test("schema - tasks table has correct columns", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  // Insert a task with all fields
  db.execute(
    `INSERT INTO tasks (id, title, completed, section, description, tags, due_date, assignee, priority, effort, milestone, blocked_by, planned_start, planned_end, parent_id, config)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "task-1",
      "Test Task",
      1,
      "todo",
      "Description",
      '["tag1", "tag2"]',
      "2026-03-01",
      "john",
      1,
      4,
      "milestone-1",
      '["task-0"]',
      "2026-02-15",
      "2026-02-20",
      null,
      '{"custom": "value"}',
    ],
  );

  const task = db.queryOne<{
    id: string;
    title: string;
    completed: number;
    section: string;
    tags: string;
    config: string;
  }>("SELECT * FROM tasks WHERE id = ?", ["task-1"]);

  assertEquals(task?.id, "task-1");
  assertEquals(task?.title, "Test Task");
  assertEquals(task?.completed, 1);
  assertEquals(task?.section, "todo");
  assertEquals(JSON.parse(task?.tags || "[]"), ["tag1", "tag2"]);
  assertEquals(JSON.parse(task?.config || "{}").custom, "value");

  db.close();
});

Deno.test("schema - notes table supports all modes", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  db.execute(
    `INSERT INTO notes (id, title, content, mode, paragraphs, custom_sections, revision)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      "note-1",
      "Test Note",
      "Content here",
      "enhanced",
      '[{"id": "p1", "text": "Para 1"}]',
      '[{"title": "Custom", "content": "Section content"}]',
      3,
    ],
  );

  const note = db.queryOne<{
    id: string;
    mode: string;
    paragraphs: string;
    revision: number;
  }>("SELECT * FROM notes WHERE id = ?", ["note-1"]);

  assertEquals(note?.mode, "enhanced");
  assertEquals(note?.revision, 3);
  assertEquals(JSON.parse(note?.paragraphs || "[]").length, 1);

  db.close();
});

Deno.test("schema - foreign keys are enforced", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  // Insert a company first
  db.execute(
    "INSERT INTO companies (id, name) VALUES (?, ?)",
    ["company-1", "Test Company"],
  );

  // Insert a contact referencing the company
  db.execute(
    "INSERT INTO contacts (id, company_id, first_name, last_name) VALUES (?, ?, ?, ?)",
    ["contact-1", "company-1", "John", "Doe"],
  );

  const contact = db.queryOne<{ company_id: string }>(
    "SELECT company_id FROM contacts WHERE id = ?",
    ["contact-1"],
  );

  assertEquals(contact?.company_id, "company-1");

  db.close();
});

Deno.test("schema - FTS triggers populate search index", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  // Insert a task
  db.execute(
    "INSERT INTO tasks (id, title, description) VALUES (?, ?, ?)",
    ["task-1", "Important Task", "This is the description"],
  );

  // Query FTS
  const results = db.query<{ id: string }>(
    "SELECT id FROM tasks_fts WHERE tasks_fts MATCH ?",
    ["Important"],
  );

  assertEquals(results.length, 1);
  assertEquals(results[0].id, "task-1");

  db.close();
});

Deno.test("schema - indexes are created", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  const indexes = db.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'",
  );

  // Should have multiple indexes
  assertEquals(indexes.length > 10, true, "Should have multiple indexes");

  // Check specific indexes
  const indexNames = indexes.map((i) => i.name);
  assertEquals(indexNames.includes("idx_tasks_section"), true);
  assertEquals(indexNames.includes("idx_tasks_assignee"), true);
  assertEquals(indexNames.includes("idx_deals_stage"), true);

  db.close();
});
