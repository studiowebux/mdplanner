// C4 entity registration for SQLite cache.

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
import type { C4Repository } from "../../repositories/c4.repository.ts";
import type { C4Component, C4Connection } from "../../types/c4.types.ts";

export const C4_TABLE = "c4_components";

export function rowToC4(
  row: Record<string, string | number | null>,
): C4Component {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    level: (row.level as C4Component["level"]) ?? "context",
    type: (row.type as string) ?? "",
    description: row.description as string | undefined,
    technology: row.technology as string | undefined,
    position: parseJson<{ x: number; y: number }>(row.position) ??
      { x: 0, y: 0 },
    diagram: row.diagram ? String(row.diagram) : "default",
    parent: row.parent as string | undefined,
    children: parseJson<string[]>(row.children) ?? [],
    connections: parseJson<C4Connection[]>(row.connections) ?? [],
    ...archiveFieldsFromRow(row),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${C4_TABLE} (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  type TEXT,
  description TEXT,
  technology TEXT,
  position TEXT,
  diagram TEXT DEFAULT 'default',
  parent TEXT,
  children TEXT,
  connections TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

const MIGRATIONS = [
  `ALTER TABLE ${C4_TABLE} ADD COLUMN diagram TEXT DEFAULT 'default'`,
  ...archiveMigrations(C4_TABLE),
];

function insertRow(db: CacheDatabase, c: C4Component, syncedAt?: string): void {
  db.execute(
    `INSERT OR REPLACE INTO ${C4_TABLE} (id, name, level, type, description, technology,
       position, diagram, parent, children, connections,
       ${archiveCols()},
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(c.id),
      val(c.name),
      val(c.level),
      val(c.type),
      val(c.description),
      val(c.technology),
      json(c.position),
      val(c.diagram ?? "default"),
      val(c.parent),
      json(c.children ?? []),
      json(c.connections ?? []),
      ...archiveVals(c),
      ...auditVals(c),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerC4Entity(repo: C4Repository): void {
  registerEntityCache({
    table: C4_TABLE,
    schema: SCHEMA,
    migrations: MIGRATIONS,
    fts: {
      type: "c4_component",
      columns: ["id", "name", "type", "description", "technology"],
      titleCol: "name",
      contentCol: "description",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertRow,
  });
}
