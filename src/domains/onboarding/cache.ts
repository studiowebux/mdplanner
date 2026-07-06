// Onboarding entity registration for SQLite cache.

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
import type { OnboardingRepository } from "../../repositories/onboarding.repository.ts";
import type {
  Onboarding,
  OnboardingStep,
} from "../../types/onboarding.types.ts";

export const ONBOARDING_TABLE = "onboarding";

export function rowToOnboarding(
  row: Record<string, string | number | null>,
): Onboarding {
  return {
    id: row.id as string,
    employeeName: (row.employee_name as string) ?? "",
    role: (row.role as string) ?? "",
    startDate: row.start_date as string | null | undefined,
    personId: row.person_id as string | null | undefined,
    notes: row.notes as string | null | undefined,
    steps: parseJson<OnboardingStep[]>(row.steps) ?? [],
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
  };
}

const ONBOARDING_SCHEMA = `CREATE TABLE IF NOT EXISTS ${ONBOARDING_TABLE} (
  id TEXT PRIMARY KEY,
  employee_name TEXT NOT NULL,
  role TEXT NOT NULL,
  start_date TEXT,
  person_id TEXT,
  notes TEXT,
  steps TEXT,
  steps_text TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertOnboardingRow(
  db: CacheDatabase,
  item: Onboarding,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${ONBOARDING_TABLE} (id, employee_name, role,
       start_date, person_id, notes, steps, steps_text,
       ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(item.id),
      val(item.employeeName),
      val(item.role),
      val(item.startDate ?? null),
      val(item.personId ?? null),
      val(item.notes ?? null),
      json(item.steps),
      item.steps.map((s) => s.title).join(" "),
      ...archiveVals(item),
      ...auditVals(item),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerOnboardingEntity(
  repo: OnboardingRepository,
): void {
  registerEntityCache({
    table: ONBOARDING_TABLE,
    schema: ONBOARDING_SCHEMA,
    migrations: [
      ...archiveMigrations(ONBOARDING_TABLE),
    ],
    fts: {
      type: "onboarding",
      columns: ["id", "employee_name", "steps_text"],
      titleCol: "employee_name",
      contentCol: "steps_text",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertOnboardingRow,
  });
}
