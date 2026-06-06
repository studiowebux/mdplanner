// ReflectionTemplate entity registration for SQLite cache.

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
  jsonVal,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { ReflectionTemplateRepository } from "../../repositories/reflection-template.repository.ts";
import type { ReflectionTemplate } from "../../types/reflection-template.types.ts";

export const REFLECTION_TEMPLATE_TABLE = "reflection_templates";

export function rowToReflectionTemplate(
  row: Record<string, string | number | null>,
): ReflectionTemplate {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    description: row.description as string | null | undefined,
    period: row.period as string | null | undefined,
    categories: parseJson<string[]>(row.categories),
    prompts: parseJson<string[]>(row.prompts) ?? [],
    ...archiveFieldsFromRow(row),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const REFLECTION_TEMPLATE_SCHEMA =
  `CREATE TABLE IF NOT EXISTS ${REFLECTION_TEMPLATE_TABLE} (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  period TEXT,
  categories TEXT,
  prompts TEXT,
  prompts_text TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertReflectionTemplateRow(
  db: CacheDatabase,
  t: ReflectionTemplate,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${REFLECTION_TEMPLATE_TABLE} (id, name, description,
       period, categories, prompts, prompts_text,
       ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(t.id),
      val(t.name),
      val(t.description ?? null),
      val(t.period ?? null),
      jsonVal(t.categories),
      json(t.prompts),
      t.prompts.join(" "),
      ...archiveVals(t),
      ...auditVals(t),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerReflectionTemplateEntity(
  repo: ReflectionTemplateRepository,
): void {
  registerEntityCache({
    table: REFLECTION_TEMPLATE_TABLE,
    schema: REFLECTION_TEMPLATE_SCHEMA,
    migrations: [
      ...archiveMigrations(REFLECTION_TEMPLATE_TABLE),
    ],
    fts: {
      type: "reflection_template",
      columns: ["id", "name", "prompts_text"],
      titleCol: "name",
      contentCol: "prompts_text",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertReflectionTemplateRow,
  });
}
