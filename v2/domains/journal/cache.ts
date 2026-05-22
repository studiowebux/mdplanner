// Journal entry entity registration for SQLite cache.

import {
  auditCols,
  auditVals,
  ENTITIES,
  json,
  parseJson,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { JournalRepository } from "../../repositories/journal.repository.ts";
import type { JournalEntry } from "../../types/journal.types.ts";

export const JOURNAL_TABLE = "journal_entry";

export function rowToJournalEntry(
  row: Record<string, string | number | null>,
): JournalEntry {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    content: row.content as string | undefined,
    date: (row.date as string) ?? "",
    mood: row.mood as JournalEntry["mood"],
    tags: parseJson<string[]>(row.tags) ?? [],
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${JOURNAL_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  date TEXT,
  mood TEXT,
  tags TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertRow(
  db: CacheDatabase,
  e: JournalEntry,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${JOURNAL_TABLE} (id, title, content, date, mood, tags,
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(e.id),
      val(e.title),
      val(e.content),
      val(e.date),
      val(e.mood),
      json(e.tags),
      ...auditVals(e),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerJournalEntity(repo: JournalRepository): void {
  const entity: EntityDef = {
    table: JOURNAL_TABLE,
    schema: SCHEMA,
    fts: {
      type: "journal",
      columns: ["id", "title", "content"],
      titleCol: "title",
      contentCol: "content",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const e of items) insertRow(db, e, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
