// Note entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveMigrations,
  archiveVals,
  AUDIT_COLS_DDL,
  auditCols,
  auditVals,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { NoteRepository } from "../../repositories/note.repository.ts";
import type { Note, NoteParagraph } from "../../types/note.types.ts";

export const NOTE_TABLE = "notes";

function blocksText(blocks: NoteParagraph[]): string {
  return blocks.map((b) => b.content).filter(Boolean).join("\n");
}

/** Flatten all text from a note (raw content + structured paragraphs + custom sections) for FTS indexing. */
function flattenNoteContent(n: Note): string {
  const parts: string[] = [];
  if (n.content) parts.push(n.content);
  for (const p of n.paragraphs ?? []) {
    if (p.content) parts.push(p.content);
  }
  for (const s of n.customSections ?? []) {
    for (const tab of s.config.tabs ?? []) {
      parts.push(tab.title);
      parts.push(blocksText(tab.content));
    }
    for (const item of s.config.timeline ?? []) {
      parts.push(item.title);
      parts.push(blocksText(item.content));
    }
    for (const col of s.config.splitView?.columns ?? []) {
      parts.push(blocksText(col));
    }
  }
  return parts.filter(Boolean).join("\n");
}

const NOTE_SCHEMA = `CREATE TABLE IF NOT EXISTS ${NOTE_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  project TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

export function insertNoteRow(
  db: CacheDatabase,
  n: Note,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${NOTE_TABLE} (id, title, content, project,
       ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(n.id),
      val(n.title),
      val(flattenNoteContent(n)),
      val(n.project),
      ...archiveVals(n),
      ...auditVals(n),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the note cache entity. Call from initServices(). */
export function registerNoteEntity(repo: NoteRepository): void {
  registerEntityCache({
    table: NOTE_TABLE,
    schema: NOTE_SCHEMA,
    migrations: [
      `CREATE INDEX IF NOT EXISTS idx_notes_project ON ${NOTE_TABLE} (project)`,
      ...archiveMigrations(NOTE_TABLE),
    ],
    fts: {
      type: "note",
      columns: ["id", "title", "content"],
      titleCol: "title",
      contentCol: "content",
    },
    source: () => repo.findAll(),
    insert: insertNoteRow,
  });
}
