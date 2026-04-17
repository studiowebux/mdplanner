// Sticky Note entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  auditCols,
  auditVals,
  ENTITIES,
  json,
  parseJson,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { StickyNoteRepository } from "../../repositories/sticky-note.repository.ts";
import type { StickyBoard, StickyNote } from "../../types/sticky-note.types.ts";

export const STICKY_NOTE_TABLE = "sticky_notes";
export const STICKY_BOARD_TABLE = "sticky_boards";

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
    boardId: (row.board_id as string) ?? "default",
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

/** Deserialize a SQLite row to a StickyBoard. */
export function rowToStickyBoard(row: Record<string, unknown>): StickyBoard {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    description: row.description as string | undefined,
    projects: parseJson<string[]>(row.projects) ?? [],
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
  board_id TEXT NOT NULL DEFAULT 'default',
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

const STICKY_BOARD_SCHEMA = `CREATE TABLE IF NOT EXISTS ${STICKY_BOARD_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  projects TEXT,
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
       id, content, color, position_x, position_y, size_width, size_height, board_id,
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(note.id),
      val(note.content),
      val(note.color),
      note.position.x,
      note.position.y,
      note.size?.width ?? null,
      note.size?.height ?? null,
      val(note.boardId),
      ...auditVals(note),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

function insertStickyBoardRow(
  db: CacheDatabase,
  board: StickyBoard,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${STICKY_BOARD_TABLE} (
       id, title, description, projects, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(board.id),
      val(board.title),
      val(board.description),
      json(board.projects),
      ...auditVals(board),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the sticky note cache entities. Call from initServices(). */
export function registerStickyNoteEntity(repo: StickyNoteRepository): void {
  const noteEntity: EntityDef = {
    table: STICKY_NOTE_TABLE,
    schema: STICKY_NOTE_SCHEMA,
    migrations: [
      `ALTER TABLE ${STICKY_NOTE_TABLE} ADD COLUMN board_id TEXT NOT NULL DEFAULT 'default'`,
    ],
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
  ENTITIES.push(noteEntity);
}

/** Register the sticky board cache entity. Call from initServices(). */
export function registerStickyBoardEntity(
  findAll: () => Promise<StickyBoard[]>,
): void {
  const boardEntity: EntityDef = {
    table: STICKY_BOARD_TABLE,
    schema: STICKY_BOARD_SCHEMA,
    fts: {
      type: "sticky_board",
      columns: ["id", "title", "description"],
      titleCol: "title",
      contentCol: "description",
    },
    sync: async (db, syncedAt) => {
      const items = await findAll();
      for (const board of items) insertStickyBoardRow(db, board, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(boardEntity);
}
