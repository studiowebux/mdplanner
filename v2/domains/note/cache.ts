// Note entity registration for SQLite cache.
// Called by initServices() after repos are created.

import { ENTITIES, val } from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { NoteRepository } from "../../repositories/note.repository.ts";
import type { Note } from "../../types/note.types.ts";

const NOTE_TABLE = "notes";

const NOTE_SCHEMA = `CREATE TABLE IF NOT EXISTS ${NOTE_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  project TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertNoteRow(
  db: CacheDatabase,
  n: Note,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${NOTE_TABLE} (id, title, content, project,
       created_at, updated_at, created_by, updated_by, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(n.id),
      val(n.title),
      val(n.content),
      val(n.project),
      val(n.createdAt),
      val(n.updatedAt),
      val(n.createdBy),
      val(n.updatedBy),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the note cache entity. Call from initServices(). */
export function registerNoteEntity(repo: NoteRepository): void {
  const entity: EntityDef = {
    table: NOTE_TABLE,
    schema: NOTE_SCHEMA,
    fts: {
      type: "note",
      columns: ["id", "title", "content"],
      titleCol: "title",
      contentCol: "content",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const n of items) insertNoteRow(db, n, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
