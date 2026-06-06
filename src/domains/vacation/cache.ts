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
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { VacationRepository } from "../../repositories/vacation.repository.ts";
import type { VacationRequest } from "../../types/vacation.types.ts";

export const VACATION_TABLE = "vacation";

export function rowToVacation(
  row: Record<string, string | number | null>,
): VacationRequest {
  return {
    id: row.id as string,
    personId: (row.person_id as string) ?? "",
    startDate: (row.start_date as string) ?? "",
    endDate: (row.end_date as string) ?? "",
    type: (row.type as VacationRequest["type"]) ?? "vacation",
    status: (row.status as VacationRequest["status"]) ?? "pending",
    notes: row.notes as string | undefined,
    ...archiveFieldsFromRow(row),
    ...auditFieldsFromRow(row),
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${VACATION_TABLE} (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  type TEXT,
  status TEXT,
  notes TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

function insertRow(
  db: CacheDatabase,
  r: VacationRequest,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${VACATION_TABLE} (id, person_id,
       start_date, end_date, type, status, notes,
       ${archiveCols()}, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(r.id),
      val(r.personId),
      val(r.startDate),
      val(r.endDate),
      val(r.type),
      val(r.status),
      val(r.notes),
      ...archiveVals(r),
      ...auditVals(r),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerVacationEntity(repo: VacationRepository): void {
  registerEntityCache({
    table: VACATION_TABLE,
    schema: SCHEMA,
    migrations: [
      ...archiveMigrations(VACATION_TABLE),
    ],
    fts: {
      type: "vacation",
      columns: ["id", "person_id", "notes"],
      titleCol: "person_id",
      contentCol: "notes",
    },
    source: () => repo.findAllFromDisk(),
    insert: insertRow,
  });
}
