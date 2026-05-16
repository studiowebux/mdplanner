// ReflectionTemplate entity registration for SQLite cache.

import {
  auditCols,
  auditVals,
  ENTITIES,
  json,
  jsonVal,
  parseJson,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
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
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertReflectionTemplateRow(
  db: CacheDatabase,
  t: ReflectionTemplate,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${REFLECTION_TEMPLATE_TABLE} (id, name, description,
       period, categories, prompts, prompts_text,
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(t.id),
      val(t.name),
      val(t.description ?? null),
      val(t.period ?? null),
      jsonVal(t.categories),
      json(t.prompts),
      t.prompts.join(" "),
      ...auditVals(t),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerReflectionTemplateEntity(
  repo: ReflectionTemplateRepository,
): void {
  const entity: EntityDef = {
    table: REFLECTION_TEMPLATE_TABLE,
    schema: REFLECTION_TEMPLATE_SCHEMA,
    fts: {
      type: "reflection_template",
      columns: ["id", "name", "prompts_text"],
      titleCol: "name",
      contentCol: "prompts_text",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const t of items) insertReflectionTemplateRow(db, t, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
