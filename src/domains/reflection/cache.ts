// Reflection entity registration for SQLite cache.

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
import type { ReflectionRepository } from "../../repositories/reflection.repository.ts";
import type { Reflection } from "../../types/reflection.types.ts";

export const REFLECTION_TABLE = "reflection";

export function rowToReflection(
  row: Record<string, string | number | null>,
): Reflection {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    period: ((row.period as string) ?? "weekly") as Reflection["period"],
    date: (row.date as string) ?? "",
    templateId: row.template_id as string | undefined,
    content: row.content as string | undefined,
    tags: parseJson<string[]>(row.tags) ?? [],
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${REFLECTION_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  period TEXT,
  date TEXT,
  template_id TEXT,
  content TEXT,
  tags TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertRow(
  db: CacheDatabase,
  r: Reflection,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${REFLECTION_TABLE} (id, title, period, date,
       template_id, content, tags, ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(r.id),
      val(r.title),
      val(r.period),
      val(r.date),
      val(r.templateId),
      val(r.content),
      json(r.tags),
      ...archiveVals(r),
      ...auditVals(r),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerReflectionEntity(repo: ReflectionRepository): void {
  registerEntityCache({
    table: REFLECTION_TABLE,
    schema: SCHEMA,
    migrations: [
      ...archiveMigrations(REFLECTION_TABLE),
    ],
    fts: {
      type: "reflection",
      columns: ["id", "title", "content"],
      titleCol: "title",
      contentCol: "content",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertRow,
  });
}
