// Investor entity registration for SQLite cache.
// Called by initServices() after repos are created.

import {
  auditCols,
  auditVals,
  ENTITIES,
  json,
  parseJson,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { InvestorRepository } from "../../repositories/investor.repository.ts";
import type { Investor } from "../../types/investor.types.ts";

export const INVESTOR_TABLE = "investor";

/** Deserialize a SQLite row to an Investor. */
export function rowToInvestor(
  row: Record<string, string | number | null>,
): Investor {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    type: (row.type as Investor["type"]) ?? "vc",
    stage: (row.stage as Investor["stage"]) ?? "lead",
    status: (row.status as Investor["status"]) ?? "not_started",
    amountTarget: row.amount_target != null
      ? Number(row.amount_target)
      : undefined,
    contact: row.contact as string | undefined,
    introDate: row.intro_date as string | undefined,
    lastContact: row.last_contact as string | undefined,
    notes: row.notes as string | undefined,
    tags: parseJson<string[]>(row.tags) ?? [],
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS ${INVESTOR_TABLE} (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  stage TEXT,
  status TEXT,
  amount_target REAL,
  contact TEXT,
  intro_date TEXT,
  last_contact TEXT,
  notes TEXT,
  tags TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertRow(
  db: CacheDatabase,
  inv: Investor,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${INVESTOR_TABLE} (id, name, type, stage, status,
       amount_target, contact, intro_date, last_contact, notes, tags,
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(inv.id),
      val(inv.name),
      val(inv.type),
      val(inv.stage),
      val(inv.status),
      inv.amountTarget ?? null,
      val(inv.contact),
      val(inv.introDate),
      val(inv.lastContact),
      val(inv.notes),
      json(inv.tags),
      ...auditVals(inv),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the investor cache entity. Call from initServices(). */
export function registerInvestorEntity(repo: InvestorRepository): void {
  const entity: EntityDef = {
    table: INVESTOR_TABLE,
    schema: SCHEMA,
    fts: {
      type: "investor",
      columns: ["id", "name", "contact", "notes"],
      titleCol: "name",
      contentCol: "notes",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const inv of items) insertRow(db, inv, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
