// OnboardingTemplate entity registration for SQLite cache.

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
import type { OnboardingTemplateRepository } from "../../repositories/onboarding-template.repository.ts";
import type {
  OnboardingTemplate,
  OnboardingTemplateStep,
} from "../../types/onboarding-template.types.ts";

export const ONBOARDING_TEMPLATE_TABLE = "onboarding_templates";

export function rowToOnboardingTemplate(
  row: Record<string, string | number | null>,
): OnboardingTemplate {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    description: row.description as string | null | undefined,
    role: row.role as string | null | undefined,
    tags: parseJson<string[]>(row.tags),
    steps: parseJson<OnboardingTemplateStep[]>(row.steps) ?? [],
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
  };
}

const ONBOARDING_TEMPLATE_SCHEMA =
  `CREATE TABLE IF NOT EXISTS ${ONBOARDING_TEMPLATE_TABLE} (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  role TEXT,
  tags TEXT,
  steps TEXT,
  steps_text TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertOnboardingTemplateRow(
  db: CacheDatabase,
  t: OnboardingTemplate,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${ONBOARDING_TEMPLATE_TABLE} (id, name, description,
       role, tags, steps, steps_text,
       ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(t.id),
      val(t.name),
      val(t.description ?? null),
      val(t.role ?? null),
      jsonVal(t.tags),
      json(t.steps),
      t.steps.map((s) => s.title).join(" "),
      ...archiveVals(t),
      ...auditVals(t),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerOnboardingTemplateEntity(
  repo: OnboardingTemplateRepository,
): void {
  registerEntityCache({
    table: ONBOARDING_TEMPLATE_TABLE,
    schema: ONBOARDING_TEMPLATE_SCHEMA,
    migrations: [
      ...archiveMigrations(ONBOARDING_TEMPLATE_TABLE),
    ],
    fts: {
      type: "onboarding_template",
      columns: ["id", "name", "steps_text"],
      titleCol: "name",
      contentCol: "steps_text",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertOnboardingTemplateRow,
  });
}
