// Journal entry entity registration for SQLite cache.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  AUDIT_COLS_DDL,
  auditCols,
  auditFieldsFromRow,
  auditVals,
  json,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
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
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${JOURNAL_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  date TEXT,
  mood TEXT,
  tags TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertRow(
  db: CacheDatabase,
  e: JournalEntry,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${JOURNAL_TABLE} (id, title, content, date, mood, tags,
       ${archiveCols()},
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(e.id),
      val(e.title),
      val(e.content),
      val(e.date),
      val(e.mood),
      json(e.tags),
      ...archiveVals(e),
      ...auditVals(e),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerJournalEntity(repo: JournalRepository): void {
  registerEntityCache({
    table: JOURNAL_TABLE,
    schema: SCHEMA,
    migrations: [
      ...archiveMigrations(JOURNAL_TABLE),
    ],
    fts: {
      type: "journal",
      columns: ["id", "title", "content"],
      titleCol: "title",
      contentCol: "content",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertRow,
  });
}
