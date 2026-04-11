// Sticky Note entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  auditCols,
  auditVals,
  ENTITIES,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { StickyNoteRepository } from "../../repositories/sticky-note.repository.ts";
import type { StickyNote } from "../../types/sticky-note.types.ts";

export const STICKY_NOTE_TABLE = "sticky_notes";

/** Deserialize a SQLite row to a StickyNote. */
export function rowToStickyNote(row: Record<string, unknown>): StickyNote {
  return {
    id: row.id as string,
    content: (row.content as string) ?? "",
    color: (row.color as string) ?? "yellow",
    position: {
      x: (row.position_x as number) ?? 0,
      y: (row.position_y as number) ?? 0,
    },
    size: row.size_width != null && row.size_height != null
      ? {
        width: row.size_width as number,
        height: row.size_height as number,
      }
      : undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const STICKY_NOTE_SCHEMA = `CREATE TABLE IF NOT EXISTS ${STICKY_NOTE_TABLE} (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  color TEXT NOT NULL,
  position_x REAL NOT NULL DEFAULT 0,
  position_y REAL NOT NULL DEFAULT 0,
  size_width REAL,
  size_height REAL,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertStickyNoteRow(
  db: CacheDatabase,
  note: StickyNote,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${STICKY_NOTE_TABLE} (
       id, content, color, position_x, position_y, size_width, size_height,
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(note.id),
      val(note.content),
      val(note.color),
      note.position.x,
      note.position.y,
      note.size?.width ?? null,
      note.size?.height ?? null,
      ...auditVals(note),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the sticky note cache entity. Call from initServices(). */
export function registerStickyNoteEntity(repo: StickyNoteRepository): void {
  const entity: EntityDef = {
    table: STICKY_NOTE_TABLE,
    schema: STICKY_NOTE_SCHEMA,
    fts: {
      type: "sticky_note",
      columns: ["id", "content"],
      titleCol: "content",
      contentCol: "content",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const note of items) insertStickyNoteRow(db, note, syncedAt);
      return items.length;
    },
    onSyncComplete: () => repo.markClean(),
  };
  ENTITIES.push(entity);
}
