/**
 * CacheDatabase tests
 */

import { assertEquals, assertExists } from "@std/assert";
import { CacheDatabase } from "../../src/lib/cache/database.ts";

const TEST_DB = ":memory:";

Deno.test("CacheDatabase - creates in-memory database", () => {
  const db = new CacheDatabase(TEST_DB);
  assertExists(db);
  db.close();
});

Deno.test("CacheDatabase - executes schema creation", () => {
  const db = new CacheDatabase(TEST_DB);
  db.exec(`
    CREATE TABLE test_table (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);
  const exists = db.tableExists("test_table");
  assertEquals(exists, true);
  db.close();
});

Deno.test("CacheDatabase - insert and query", () => {
  const db = new CacheDatabase(TEST_DB);
  db.exec("CREATE TABLE items (id TEXT PRIMARY KEY, value INTEGER)");

  db.execute("INSERT INTO items (id, value) VALUES (?, ?)", ["item1", 42]);
  db.execute("INSERT INTO items (id, value) VALUES (?, ?)", ["item2", 100]);

  const rows = db.query<{ id: string; value: number }>(
    "SELECT * FROM items ORDER BY id",
  );
  assertEquals(rows.length, 2);
  assertEquals(rows[0].id, "item1");
  assertEquals(rows[0].value, 42);

  db.close();
});

Deno.test("CacheDatabase - queryOne returns single row", () => {
  const db = new CacheDatabase(TEST_DB);
  db.exec("CREATE TABLE items (id TEXT PRIMARY KEY, value INTEGER)");
  db.execute("INSERT INTO items (id, value) VALUES (?, ?)", ["item1", 42]);

  const row = db.queryOne<{ id: string; value: number }>(
    "SELECT * FROM items WHERE id = ?",
    ["item1"],
  );

  assertExists(row);
  assertEquals(row!.id, "item1");
  assertEquals(row!.value, 42);

  db.close();
});

Deno.test("CacheDatabase - queryOne returns null for no match", () => {
  const db = new CacheDatabase(TEST_DB);
  db.exec("CREATE TABLE items (id TEXT PRIMARY KEY, value INTEGER)");

  const row = db.queryOne<{ id: string; value: number }>(
    "SELECT * FROM items WHERE id = ?",
    ["nonexistent"],
  );

  assertEquals(row, null);
  db.close();
});

Deno.test("CacheDatabase - count returns row count", () => {
  const db = new CacheDatabase(TEST_DB);
  db.exec("CREATE TABLE items (id TEXT PRIMARY KEY)");
  db.execute("INSERT INTO items (id) VALUES (?)", ["a"]);
  db.execute("INSERT INTO items (id) VALUES (?)", ["b"]);
  db.execute("INSERT INTO items (id) VALUES (?)", ["c"]);

  const count = db.count("items");
  assertEquals(count, 3);

  db.close();
});

Deno.test("CacheDatabase - truncate clears table", () => {
  const db = new CacheDatabase(TEST_DB);
  db.exec("CREATE TABLE items (id TEXT PRIMARY KEY)");
  db.execute("INSERT INTO items (id) VALUES (?)", ["a"]);
  db.execute("INSERT INTO items (id) VALUES (?)", ["b"]);

  assertEquals(db.count("items"), 2);

  db.truncate("items");

  assertEquals(db.count("items"), 0);
  db.close();
});

Deno.test("CacheDatabase - transaction commits on success", () => {
  const db = new CacheDatabase(TEST_DB);
  db.exec("CREATE TABLE items (id TEXT PRIMARY KEY, value INTEGER)");

  db.transaction(() => {
    db.execute("INSERT INTO items (id, value) VALUES (?, ?)", ["a", 1]);
    db.execute("INSERT INTO items (id, value) VALUES (?, ?)", ["b", 2]);
  });

  assertEquals(db.count("items"), 2);
  db.close();
});

Deno.test("CacheDatabase - transaction rolls back on error", () => {
  const db = new CacheDatabase(TEST_DB);
  db.exec("CREATE TABLE items (id TEXT PRIMARY KEY, value INTEGER)");

  try {
    db.transaction(() => {
      db.execute("INSERT INTO items (id, value) VALUES (?, ?)", ["a", 1]);
      throw new Error("Simulated error");
    });
  } catch {
    // Expected
  }

  assertEquals(db.count("items"), 0);
  db.close();
});

Deno.test("CacheDatabase - tableExists returns false for missing table", () => {
  const db = new CacheDatabase(TEST_DB);
  const exists = db.tableExists("nonexistent_table");
  assertEquals(exists, false);
  db.close();
});

Deno.test("CacheDatabase - handles null values", () => {
  const db = new CacheDatabase(TEST_DB);
  db.exec("CREATE TABLE items (id TEXT PRIMARY KEY, optional TEXT)");
  db.execute("INSERT INTO items (id, optional) VALUES (?, ?)", ["a", null]);

  const row = db.queryOne<{ id: string; optional: string | null }>(
    "SELECT * FROM items WHERE id = ?",
    ["a"],
  );

  assertExists(row);
  assertEquals(row!.optional, null);
  db.close();
});

Deno.test("CacheDatabase - execute returns affected row count", () => {
  const db = new CacheDatabase(TEST_DB);
  db.exec("CREATE TABLE items (id TEXT PRIMARY KEY, value INTEGER)");
  db.execute("INSERT INTO items (id, value) VALUES (?, ?)", ["a", 1]);
  db.execute("INSERT INTO items (id, value) VALUES (?, ?)", ["b", 1]);
  db.execute("INSERT INTO items (id, value) VALUES (?, ?)", ["c", 2]);

  const affected = db.execute("UPDATE items SET value = ? WHERE value = ?", [
    99,
    1,
  ]);
  assertEquals(affected, 2);

  db.close();
});
