// BrainstormTemplate entity registration for SQLite cache.

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
import type { BrainstormTemplateRepository } from "../../repositories/brainstorm-template.repository.ts";
import type { BrainstormTemplate } from "../../types/brainstorm-template.types.ts";

export const BRAINSTORM_TEMPLATE_TABLE = "brainstorm_templates";

export function rowToBrainstormTemplate(
  row: Record<string, string | number | null>,
): BrainstormTemplate {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    description: row.description as string | null | undefined,
    categories: parseJson<string[]>(row.categories),
    questions: parseJson<string[]>(row.questions) ?? [],
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const BRAINSTORM_TEMPLATE_SCHEMA =
  `CREATE TABLE IF NOT EXISTS ${BRAINSTORM_TEMPLATE_TABLE} (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  categories TEXT,
  questions TEXT,
  questions_text TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertBrainstormTemplateRow(
  db: CacheDatabase,
  t: BrainstormTemplate,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${BRAINSTORM_TEMPLATE_TABLE} (id, name, description,
       categories, questions, questions_text,
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(t.id),
      val(t.name),
      val(t.description ?? null),
      jsonVal(t.categories),
      json(t.questions),
      t.questions.join(" "),
      ...auditVals(t),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerBrainstormTemplateEntity(
  repo: BrainstormTemplateRepository,
): void {
  const entity: EntityDef = {
    table: BRAINSTORM_TEMPLATE_TABLE,
    schema: BRAINSTORM_TEMPLATE_SCHEMA,
    fts: {
      type: "brainstorm_template",
      columns: ["id", "name", "questions_text"],
      titleCol: "name",
      contentCol: "questions_text",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const t of items) insertBrainstormTemplateRow(db, t, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
