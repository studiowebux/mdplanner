// Project Value Board entity registration for SQLite cache.

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
import type { ProjectValueBoardRepository } from "../../repositories/project-value-board.repository.ts";
import type { ProjectValueBoard } from "../../types/project-value-board.types.ts";

export const PROJECT_VALUE_BOARD_TABLE = "project_value_board";

export function rowToProjectValueBoard(
  row: Record<string, string | number | null>,
): ProjectValueBoard {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    date: (row.date as string) ?? "",
    customerSegments: parseJson<string[]>(row.customer_segments) ?? [],
    problem: parseJson<string[]>(row.problem) ?? [],
    solution: parseJson<string[]>(row.solution) ?? [],
    benefit: parseJson<string[]>(row.benefit) ?? [],
    project: row.project as string | undefined,
    notes: row.notes as string | undefined,
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${PROJECT_VALUE_BOARD_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,
  customer_segments TEXT,
  problem TEXT,
  solution TEXT,
  benefit TEXT,
  project TEXT,
  notes TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertRow(
  db: CacheDatabase,
  b: ProjectValueBoard,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${PROJECT_VALUE_BOARD_TABLE}
       (id, title, date, customer_segments, problem, solution, benefit,
        project, notes, ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(b.id),
      val(b.title),
      val(b.date),
      json(b.customerSegments),
      json(b.problem),
      json(b.solution),
      json(b.benefit),
      val(b.project),
      val(b.notes),
      ...archiveVals(b),
      ...auditVals(b),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerProjectValueBoardEntity(
  repo: ProjectValueBoardRepository,
): void {
  registerEntityCache({
    table: PROJECT_VALUE_BOARD_TABLE,
    schema: SCHEMA,
    migrations: [
      ...archiveMigrations(PROJECT_VALUE_BOARD_TABLE),
    ],
    fts: {
      type: "project_value",
      columns: ["id", "title", "notes"],
      titleCol: "title",
      contentCol: "notes",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertRow,
  });
}
