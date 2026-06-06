// Finance entity registration for SQLite cache.

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
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
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
    ...auditFieldsFromRow(row),
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
  ${AUDIT_COLS_DDL}
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
  registerEntityCache({
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
    source: () => repo.findAllFromDisk(),
    insert: insertFinanceRow,
  });
}
