// Finance entity registration for SQLite cache.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  auditCols,
  auditVals,
  ENTITIES,
  json,
  parseJson,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { FinanceRepository } from "../../repositories/finance.repository.ts";
import type { Finance, FinanceType } from "../../types/finance.types.ts";

export const FINANCE_TABLE = "finances";

export function rowToFinance(
  row: Record<string, string | number | null>,
): Finance {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    type: (row.type as FinanceType) ?? "expense",
    amount: row.amount != null ? (row.amount as number) : 0,
    currency: row.currency as string | undefined,
    date: row.date as string | undefined,
    description: row.description as string | undefined,
    tags: parseJson<string[]>(row.tags) ?? [],
    ...archiveFieldsFromRow(row),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const FINANCE_SCHEMA = `CREATE TABLE IF NOT EXISTS ${FINANCE_TABLE} (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT,
  date TEXT,
  description TEXT,
  tags TEXT,
  ${ARCHIVE_COLS_DDL},
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

export function insertFinanceRow(
  db: CacheDatabase,
  f: Finance,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${FINANCE_TABLE} (id, title, type, amount, currency,
       date, description, tags,
       ${archiveCols()},
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(f.id),
      val(f.title),
      val(f.type),
      f.amount,
      val(f.currency),
      val(f.date),
      val(f.description),
      json(f.tags ?? []),
      ...archiveVals(f),
      ...auditVals(f),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerFinanceEntity(repo: FinanceRepository): void {
  const entity: EntityDef = {
    table: FINANCE_TABLE,
    schema: FINANCE_SCHEMA,
    migrations: [
      ...archiveMigrations(FINANCE_TABLE),
    ],
    fts: {
      type: "finance",
      columns: ["id", "title", "description"],
      titleCol: "title",
      contentCol: "description",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const f of items) insertFinanceRow(db, f, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
