// Customer entity registration for SQLite cache.
// Called by initServices() after repos are created.

import { ENTITIES, val } from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { CustomerRepository } from "../../repositories/customer.repository.ts";
import type { Customer } from "../../types/customer.types.ts";

export const CUSTOMER_TABLE = "customers";

/** Deserialize a SQLite row to a Customer. */
export function rowToCustomer(row: Record<string, unknown>): Customer {
  const hasAddress = row.street || row.city || row.state || row.postal_code ||
    row.country;
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    email: row.email as string | undefined,
    phone: row.phone as string | undefined,
    company: row.company as string | undefined,
    billingAddress: hasAddress
      ? {
        street: row.street as string | undefined,
        city: row.city as string | undefined,
        state: row.state as string | undefined,
        postalCode: row.postal_code as string | undefined,
        country: row.country as string | undefined,
      }
      : undefined,
    notes: row.notes as string | undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const CUSTOMER_SCHEMA = `CREATE TABLE IF NOT EXISTS ${CUSTOMER_TABLE} (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  street TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  notes TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

export function insertCustomerRow(
  db: CacheDatabase,
  c: Customer,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${CUSTOMER_TABLE} (id, name, email, phone,
       company, street, city, state, postal_code, country, notes,
       created_at, updated_at, created_by, updated_by, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(c.id),
      val(c.name),
      val(c.email),
      val(c.phone),
      val(c.company),
      val(c.billingAddress?.street),
      val(c.billingAddress?.city),
      val(c.billingAddress?.state),
      val(c.billingAddress?.postalCode),
      val(c.billingAddress?.country),
      val(c.notes),
      val(c.createdAt),
      val(c.updatedAt),
      val(c.createdBy),
      val(c.updatedBy),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the customer cache entity. Call from initServices(). */
export function registerCustomerEntity(repo: CustomerRepository): void {
  const entity: EntityDef = {
    table: CUSTOMER_TABLE,
    schema: CUSTOMER_SCHEMA,
    fts: {
      type: "customer",
      columns: ["id", "name", "company", "notes"],
      titleCol: "name",
      contentCol: "notes",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const c of items) insertCustomerRow(db, c, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
