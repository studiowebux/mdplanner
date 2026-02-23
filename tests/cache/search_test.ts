/**
 * SearchEngine tests
 */

import { assertEquals, assertExists } from "@std/assert";
import { CacheDatabase } from "../../src/lib/cache/database.ts";
import { initSchema } from "../../src/lib/cache/schema.ts";
import { SearchEngine } from "../../src/lib/cache/search.ts";

const TEST_DB = ":memory:";

function setupTestData(db: CacheDatabase): void {
  // Insert test tasks
  db.execute(
    "INSERT INTO tasks (id, title, description, section) VALUES (?, ?, ?, ?)",
    [
      "task-1",
      "Fix login bug",
      "Users cannot login with special characters",
      "todo",
    ],
  );
  db.execute(
    "INSERT INTO tasks (id, title, description, section) VALUES (?, ?, ?, ?)",
    ["task-2", "Add user profile", "Create user profile page", "in_progress"],
  );
  db.execute(
    "INSERT INTO tasks (id, title, description, section) VALUES (?, ?, ?, ?)",
    ["task-3", "Update documentation", "Refresh the API docs", "done"],
  );

  // Insert test notes
  db.execute(
    "INSERT INTO notes (id, title, content, mode) VALUES (?, ?, ?, ?)",
    [
      "note-1",
      "Meeting Notes",
      "Discussed login issues and user feedback",
      "simple",
    ],
  );
  db.execute(
    "INSERT INTO notes (id, title, content, mode) VALUES (?, ?, ?, ?)",
    ["note-2", "Architecture Decision", "Using SQLite for caching", "enhanced"],
  );

  // Insert test goals
  db.execute(
    "INSERT INTO goals (id, title, description, status) VALUES (?, ?, ?, ?)",
    ["goal-1", "Improve Performance", "Reduce page load time by 50%", "active"],
  );

  // Insert test ideas
  db.execute(
    "INSERT INTO ideas (id, title, description, status) VALUES (?, ?, ?, ?)",
    ["idea-1", "Mobile App", "Create a mobile version of the app", "new"],
  );
  db.execute(
    "INSERT INTO ideas (id, title, description, status) VALUES (?, ?, ?, ?)",
    ["idea-2", "Dark Mode", "Add dark mode support for better UX", "approved"],
  );

  // Insert test meetings
  db.execute(
    "INSERT INTO meetings (id, title, date, notes) VALUES (?, ?, ?, ?)",
    [
      "meeting-1",
      "Sprint Planning",
      "2026-02-22",
      "Reviewed backlog and assigned sprint tasks to team members",
    ],
  );
  db.execute(
    "INSERT INTO meetings (id, title, date, notes) VALUES (?, ?, ?, ?)",
    [
      "meeting-2",
      "Quarterly Review",
      "2026-02-15",
      "Discussed revenue targets and product roadmap progress",
    ],
  );

  // Insert test people
  db.execute(
    "INSERT INTO people (id, name, title, notes) VALUES (?, ?, ?, ?)",
    [
      "person-1",
      "Alice Martin",
      "Engineering Lead",
      "Leads backend infrastructure and database performance",
    ],
  );
  db.execute(
    "INSERT INTO people (id, name, title, notes) VALUES (?, ?, ?, ?)",
    [
      "person-2",
      "Bob Chen",
      "Product Manager",
      "Owns product roadmap and sprint planning",
    ],
  );
}

Deno.test("SearchEngine - search returns matching tasks", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);
  setupTestData(db);

  const search = new SearchEngine(db);
  const results = search.search("login");

  assertEquals(results.length >= 1, true);

  const taskResult = results.find((r) =>
    r.type === "task" && r.id === "task-1"
  );
  assertExists(taskResult);
  assertEquals(taskResult!.title, "Fix login bug");

  db.close();
});

Deno.test("SearchEngine - search returns matching notes", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);
  setupTestData(db);

  const search = new SearchEngine(db);
  const results = search.search("Meeting");

  const noteResult = results.find((r) => r.type === "note");
  assertExists(noteResult);
  assertEquals(noteResult!.id, "note-1");

  db.close();
});

Deno.test("SearchEngine - search filters by type", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);
  setupTestData(db);

  const search = new SearchEngine(db);

  // Search only tasks
  const taskResults = search.search("user", { types: ["task"] });
  const hasNote = taskResults.some((r) => r.type === "note");
  assertEquals(hasNote, false);

  // Search only notes
  const noteResults = search.search("user", { types: ["note"] });
  const hasTask = noteResults.some((r) => r.type === "task");
  assertEquals(hasTask, false);

  db.close();
});

Deno.test("SearchEngine - search respects limit", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);
  setupTestData(db);

  const search = new SearchEngine(db);
  const results = search.search("a", { limit: 2 });

  assertEquals(results.length <= 2, true);

  db.close();
});

Deno.test("SearchEngine - search handles empty query", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);
  setupTestData(db);

  const search = new SearchEngine(db);
  const results = search.search("");

  assertEquals(results.length, 0);

  db.close();
});

Deno.test("SearchEngine - search handles whitespace query", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);
  setupTestData(db);

  const search = new SearchEngine(db);
  const results = search.search("   ");

  assertEquals(results.length, 0);

  db.close();
});

Deno.test("SearchEngine - search returns matching meetings", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);
  setupTestData(db);

  const search = new SearchEngine(db);
  const results = search.search("Sprint");

  const meetingResult = results.find((r) => r.type === "meeting");
  assertExists(meetingResult);
  assertEquals(meetingResult!.id, "meeting-1");
  assertEquals(meetingResult!.title, "Sprint Planning");

  db.close();
});

Deno.test("SearchEngine - search returns matching people", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);
  setupTestData(db);

  const search = new SearchEngine(db);
  const results = search.search("Alice");

  const personResult = results.find((r) => r.type === "person");
  assertExists(personResult);
  assertEquals(personResult!.id, "person-1");
  assertEquals(personResult!.title, "Alice Martin");

  db.close();
});

Deno.test("SearchEngine - getStats returns correct counts", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);
  setupTestData(db);

  const search = new SearchEngine(db);
  const stats = search.getStats();

  assertEquals(stats.tasks, 3);
  assertEquals(stats.notes, 2);
  assertEquals(stats.goals, 1);
  assertEquals(stats.ideas, 2);
  assertEquals(stats.meetings, 2);
  assertEquals(stats.people, 2);
  assertEquals(stats.total >= 12, true);

  db.close();
});

Deno.test("SearchEngine - getStats handles empty database", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  const search = new SearchEngine(db);
  const stats = search.getStats();

  assertEquals(stats.tasks, 0);
  assertEquals(stats.notes, 0);
  assertEquals(stats.goals, 0);
  assertEquals(stats.ideas, 0);

  db.close();
});

Deno.test("SearchEngine - search across multiple types", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);
  setupTestData(db);

  const search = new SearchEngine(db);

  // "user" appears in tasks and notes
  const results = search.search("user", { types: ["task", "note"] });

  const types = new Set(results.map((r) => r.type));
  assertEquals(types.size >= 1, true);

  db.close();
});

Deno.test("SearchEngine - search with offset for pagination", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);
  setupTestData(db);

  const search = new SearchEngine(db);

  // Get first page
  const page1 = search.search("a", { limit: 2, offset: 0 });

  // Get second page
  const page2 = search.search("a", { limit: 2, offset: 2 });

  // Pages should be different (if there are enough results)
  if (page1.length > 0 && page2.length > 0) {
    const page1Ids = new Set(page1.map((r) => r.id));
    const hasOverlap = page2.some((r) => page1Ids.has(r.id));
    assertEquals(hasOverlap, false);
  }

  db.close();
});

Deno.test("SearchEngine - search results include snippets", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);
  setupTestData(db);

  const search = new SearchEngine(db);
  const results = search.search("login");

  const result = results.find((r) => r.id === "task-1");
  assertExists(result);
  // Snippet should contain highlight marks or content
  assertExists(result!.snippet);

  db.close();
});

Deno.test("SearchEngine - search handles special characters", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  // Insert data with special characters
  db.execute(
    "INSERT INTO tasks (id, title, description) VALUES (?, ?, ?)",
    ["task-special", "Fix C++ compiler", "Handle <template> syntax"],
  );

  const search = new SearchEngine(db);

  // Should not crash on special characters
  const results = search.search("C++");
  assertEquals(Array.isArray(results), true);

  db.close();
});

Deno.test("SearchEngine - search is case insensitive", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);
  setupTestData(db);

  const search = new SearchEngine(db);

  const lowerResults = search.search("login");
  const upperResults = search.search("LOGIN");
  const mixedResults = search.search("LoGiN");

  // All should find the same task
  assertEquals(lowerResults.length, upperResults.length);
  assertEquals(lowerResults.length, mixedResults.length);

  db.close();
});

Deno.test("SearchEngine - search returns matching swot analyses", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  db.execute(
    "INSERT INTO swot (id, title, date) VALUES (?, ?, ?)",
    ["swot-1", "Market Opportunity Analysis", "2026-02-22"],
  );

  const search = new SearchEngine(db);
  const results = search.search("Market");

  const result = results.find((r) => r.type === "swot");
  assertExists(result);
  assertEquals(result!.id, "swot-1");
  assertEquals(result!.title, "Market Opportunity Analysis");

  db.close();
});

Deno.test("SearchEngine - search returns matching briefs", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  db.execute(
    "INSERT INTO brief (id, title, date) VALUES (?, ?, ?)",
    ["brief-1", "Q1 Product Launch Brief", "2026-02-22"],
  );

  const search = new SearchEngine(db);
  const results = search.search("Product Launch");

  const result = results.find((r) => r.type === "brief");
  assertExists(result);
  assertEquals(result!.id, "brief-1");

  db.close();
});

Deno.test("SearchEngine - search returns matching retrospectives", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  db.execute(
    "INSERT INTO retrospectives (id, title, date, status) VALUES (?, ?, ?, ?)",
    ["retro-1", "Sprint 12 Retrospective", "2026-02-22", "closed"],
  );

  const search = new SearchEngine(db);
  const results = search.search("Sprint");

  const result = results.find((r) => r.type === "retrospective");
  assertExists(result);
  assertEquals(result!.id, "retro-1");

  db.close();
});

Deno.test("SearchEngine - search returns matching companies", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  db.execute(
    "INSERT INTO companies (id, name, notes, created) VALUES (?, ?, ?, ?)",
    ["co-1", "Acme Corporation", "Enterprise software partner", "2026-01-01"],
  );

  const search = new SearchEngine(db);
  const results = search.search("Acme");

  const result = results.find((r) => r.type === "company");
  assertExists(result);
  assertEquals(result!.id, "co-1");
  assertEquals(result!.title, "Acme Corporation");

  db.close();
});

Deno.test("SearchEngine - search returns matching contacts", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  db.execute(
    "INSERT INTO contacts (id, first_name, last_name, notes, created) VALUES (?, ?, ?, ?, ?)",
    ["ct-1", "Sarah", "Johnson", "Senior buyer at Acme", "2026-01-01"],
  );

  const search = new SearchEngine(db);
  const results = search.search("Sarah");

  const result = results.find((r) => r.type === "contact");
  assertExists(result);
  assertEquals(result!.id, "ct-1");
  assertEquals(result!.title, "Sarah");

  db.close();
});

Deno.test("SearchEngine - search returns matching portfolio items", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  db.execute(
    "INSERT INTO portfolio (id, name, status) VALUES (?, ?, ?)",
    ["port-1", "Website Redesign Project", "active"],
  );

  const search = new SearchEngine(db);
  const results = search.search("Website Redesign");

  const result = results.find((r) => r.type === "portfolio");
  assertExists(result);
  assertEquals(result!.id, "port-1");

  db.close();
});

Deno.test("SearchEngine - search returns matching moscow analyses", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  db.execute(
    "INSERT INTO moscow (id, title, date) VALUES (?, ?, ?)",
    ["moscow-1", "Feature Prioritization Q2", "2026-02-22"],
  );

  const search = new SearchEngine(db);
  const results = search.search("Prioritization");

  const result = results.find((r) => r.type === "moscow");
  assertExists(result);
  assertEquals(result!.id, "moscow-1");

  db.close();
});

Deno.test("SearchEngine - search returns matching eisenhower matrices", () => {
  const db = new CacheDatabase(TEST_DB);
  initSchema(db);

  db.execute(
    "INSERT INTO eisenhower (id, title, date) VALUES (?, ?, ?)",
    ["ei-1", "Weekly Task Matrix", "2026-02-22"],
  );

  const search = new SearchEngine(db);
  const results = search.search("Weekly Task");

  const result = results.find((r) => r.type === "eisenhower");
  assertExists(result);
  assertEquals(result!.id, "ei-1");

  db.close();
});
