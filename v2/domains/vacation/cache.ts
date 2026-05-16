import {
  auditCols,
  auditVals,
  ENTITIES,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
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
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
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
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertRow(
  db: CacheDatabase,
  r: VacationRequest,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${VACATION_TABLE} (id, person_id,
       start_date, end_date, type, status, notes,
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(r.id),
      val(r.personId),
      val(r.startDate),
      val(r.endDate),
      val(r.type),
      val(r.status),
      val(r.notes),
      ...auditVals(r),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerVacationEntity(repo: VacationRepository): void {
  const entity: EntityDef = {
    table: VACATION_TABLE,
    schema: SCHEMA,
    fts: {
      type: "vacation",
      columns: ["id", "person_id", "notes"],
      titleCol: "person_id",
      contentCol: "notes",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const r of items) insertRow(db, r, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
