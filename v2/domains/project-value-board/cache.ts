// Project Value Board entity registration for SQLite cache.

import {
  auditCols,
  auditVals,
  ENTITIES,
  json,
  parseJson,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
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
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
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
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertRow(
  db: CacheDatabase,
  b: ProjectValueBoard,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${PROJECT_VALUE_BOARD_TABLE}
       (id, title, date, customer_segments, problem, solution, benefit,
        project, notes, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      ...auditVals(b),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerProjectValueBoardEntity(
  repo: ProjectValueBoardRepository,
): void {
  const entity: EntityDef = {
    table: PROJECT_VALUE_BOARD_TABLE,
    schema: SCHEMA,
    fts: {
      type: "project_value",
      columns: ["id", "title", "notes"],
      titleCol: "title",
      contentCol: "notes",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const b of items) insertRow(db, b, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
