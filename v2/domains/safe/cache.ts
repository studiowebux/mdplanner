// SAFe entity registration for SQLite cache.

import {
  auditCols,
  auditVals,
  ENTITIES,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { SafeRepository } from "../../repositories/safe.repository.ts";
import type { Safe } from "../../types/safe.types.ts";

export const SAFE_TABLE = "safe";

/** Deserialize a SQLite row to a Safe. */
export function rowToSafe(row: Record<string, string | number | null>): Safe {
  return {
    id: row.id as string,
    investor: (row.investor as string) ?? "",
    amount: Number(row.amount ?? 0),
    valuation_cap: Number(row.valuation_cap ?? 0),
    discount: Number(row.discount ?? 0),
    type: (row.type as Safe["type"]) ?? "post-money",
    date: (row.date as string) ?? "",
    status: (row.status as Safe["status"]) ?? "draft",
    notes: row.notes as string | undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${SAFE_TABLE} (
  id TEXT PRIMARY KEY,
  investor TEXT NOT NULL,
  amount REAL,
  valuation_cap REAL,
  discount REAL,
  type TEXT,
  date TEXT,
  status TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertRow(db: CacheDatabase, s: Safe, syncedAt?: string): void {
  db.execute(
    `INSERT OR REPLACE INTO ${SAFE_TABLE} (id, investor, amount, valuation_cap,
       discount, type, date, status, notes, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(s.id),
      val(s.investor),
      s.amount,
      s.valuation_cap,
      s.discount,
      val(s.type),
      val(s.date),
      val(s.status),
      val(s.notes),
      ...auditVals(s),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the safe cache entity. Call from initServices(). */
export function registerSafeEntity(repo: SafeRepository): void {
  const entity: EntityDef = {
    table: SAFE_TABLE,
    schema: SCHEMA,
    fts: {
      type: "safe",
      columns: ["id", "investor", "notes"],
      titleCol: "investor",
      contentCol: "notes",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const s of items) insertRow(db, s, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
