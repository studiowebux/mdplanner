// Sticky Note entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  AUDIT_COLS_DDL,
  auditCols,
  auditVals,
  json,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { StickyNoteRepository } from "../../repositories/sticky-note.repository.ts";
import type { StickyBoard, StickyNote } from "../../types/sticky-note.types.ts";

export const STICKY_NOTE_TABLE = "sticky_notes";
export const STICKY_BOARD_TABLE = "sticky_boards";

/** Deserialize a SQLite row to a StickyNote. */
export function rowToStickyNote(
  row: Record<string, string | number | null>,
): StickyNote {
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
    ...archiveFieldsFromRow(row),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

/** Deserialize a SQLite row to a StickyBoard. */
export function rowToStickyBoard(
  row: Record<string, string | number | null>,
): StickyBoard {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    description: row.description as string | undefined,
    projects: parseJson<string[]>(row.projects) ?? [],
    ...archiveFieldsFromRow(row),
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
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

const STICKY_BOARD_SCHEMA = `CREATE TABLE IF NOT EXISTS ${STICKY_BOARD_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  projects TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertStickyNoteRow(
  db: CacheDatabase,
  note: StickyNote,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${STICKY_NOTE_TABLE} (
       id, content, color, position_x, position_y, size_width, size_height, board_id,
       ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(note.id),
      val(note.content),
      val(note.color),
      note.position.x,
      note.position.y,
      note.size?.width ?? null,
      note.size?.height ?? null,
      val(note.boardId),
      ...archiveVals(note),
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
       id, title, description, projects, ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(board.id),
      val(board.title),
      val(board.description),
      json(board.projects),
      ...archiveVals(board),
      ...auditVals(board),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the sticky note cache entities. Call from initServices(). */
export function registerStickyNoteEntity(repo: StickyNoteRepository): void {
  registerEntityCache({
    table: STICKY_NOTE_TABLE,
    schema: STICKY_NOTE_SCHEMA,
    migrations: [
      `ALTER TABLE ${STICKY_NOTE_TABLE} ADD COLUMN board_id TEXT NOT NULL DEFAULT 'default'`,
      ...archiveMigrations(STICKY_NOTE_TABLE),
    ],
    fts: {
      type: "sticky_note",
      columns: ["id", "content"],
      titleCol: "content",
      contentCol: "content",
    },
    onSyncComplete: () => repo.markClean(),
    source: () => repo.findAllFromDisk(),
    insert: insertStickyNoteRow,
  });
}

/** Register the sticky board cache entity. Call from initServices(). */
export function registerStickyBoardEntity(
  findAll: () => Promise<StickyBoard[]>,
): void {
  registerEntityCache({
    table: STICKY_BOARD_TABLE,
    schema: STICKY_BOARD_SCHEMA,
    migrations: [
      ...archiveMigrations(STICKY_BOARD_TABLE),
    ],
    fts: {
      type: "sticky_board",
      columns: ["id", "title", "description"],
      titleCol: "title",
      contentCol: "description",
    },
    source: () => findAll(),
    insert: insertStickyBoardRow,
  });
}
