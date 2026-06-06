// BrainstormTemplate entity registration for SQLite cache.

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
  jsonVal,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
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
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
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
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertBrainstormTemplateRow(
  db: CacheDatabase,
  t: BrainstormTemplate,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${BRAINSTORM_TEMPLATE_TABLE} (id, name, description,
       categories, questions, questions_text,
       ${archiveCols()},
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(t.id),
      val(t.name),
      val(t.description ?? null),
      jsonVal(t.categories),
      json(t.questions),
      t.questions.join(" "),
      ...archiveVals(t),
      ...auditVals(t),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerBrainstormTemplateEntity(
  repo: BrainstormTemplateRepository,
): void {
  registerEntityCache({
    table: BRAINSTORM_TEMPLATE_TABLE,
    schema: BRAINSTORM_TEMPLATE_SCHEMA,
    migrations: [
      `ALTER TABLE ${BRAINSTORM_TEMPLATE_TABLE} ADD COLUMN categories TEXT`,
      ...archiveMigrations(BRAINSTORM_TEMPLATE_TABLE),
    ],
    fts: {
      type: "brainstorm_template",
      columns: ["id", "name", "questions_text"],
      titleCol: "name",
      contentCol: "questions_text",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertBrainstormTemplateRow,
  });
}
