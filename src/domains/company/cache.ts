// Company entity registration for SQLite cache.

import {
  ARCHIVE_COLS_DDL,
  archiveCols,
  archiveFieldsFromRow,
  archiveMigrations,
  archiveVals,
  AUDIT_COLS_DDL,
  auditCols,
  auditVals,
  json,
  parseJson,
  registerEntityCache,
  val,
} from "../../database/sqlite/mod.ts";
import type { CacheDatabase } from "../../database/sqlite/mod.ts";
import type { CompanyRepository } from "../../repositories/company.repository.ts";
import type {
  Company,
  CompanySize,
  CompanyType,
} from "../../types/company.types.ts";

export const COMPANY_TABLE = "companies";

export function rowToCompany(
  row: Record<string, string | number | null>,
): Company {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    website: row.website as string | undefined,
    industry: row.industry as string | undefined,
    size: (row.size as CompanySize | null) ?? undefined,
    type: (row.type as CompanyType | null) ?? undefined,
    phone: row.phone as string | undefined,
    email: row.email as string | undefined,
    address: row.address as string | undefined,
    notes: row.notes as string | undefined,
    tags: parseJson<string[]>(row.tags) ?? [],
    ...archiveFieldsFromRow(row),
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const COMPANY_SCHEMA = `CREATE TABLE IF NOT EXISTS ${COMPANY_TABLE} (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  size TEXT,
  type TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  tags TEXT,
  ${ARCHIVE_COLS_DDL},
  ${AUDIT_COLS_DDL}
)`;

export function insertCompanyRow(
  db: CacheDatabase,
  c: Company,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${COMPANY_TABLE} (id, name, website, industry, size,
       type, phone, email, address, notes, tags,
       ${archiveCols()},
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(c.id),
      val(c.name),
      val(c.website),
      val(c.industry),
      val(c.size),
      val(c.type),
      val(c.phone),
      val(c.email),
      val(c.address),
      val(c.notes),
      json(c.tags ?? []),
      ...archiveVals(c),
      ...auditVals(c),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

export function registerCompanyEntity(repo: CompanyRepository): void {
  registerEntityCache({
    table: COMPANY_TABLE,
    schema: COMPANY_SCHEMA,
    fts: {
      type: "company",
      columns: ["id", "name", "industry", "website", "address", "notes"],
      titleCol: "name",
      contentCol: "notes",
    },
    migrations: [
      ...archiveMigrations(COMPANY_TABLE),
    ],
    source: () => repo.findAllFromDisk(),
    insert: insertCompanyRow,
  });
}

export const COMPANY_BODY_KEYS = ["id", "notes"] as const;
