// Contact entity registration for SQLite cache.
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
import type { ContactRepository } from "../../repositories/contact.repository.ts";
import type { Contact, ContactType } from "../../types/contact.types.ts";

export const CONTACT_TABLE = "contacts";

/** Deserialize a SQLite row to a Contact. */
export function rowToContact(
  row: Record<string, string | number | null>,
): Contact {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    email: row.email as string | undefined,
    phone: row.phone as string | undefined,
    role: row.role as string | undefined,
    company: row.company as string | undefined,
    type: (row.type as ContactType | null) ?? undefined,
    notes: row.notes as string | undefined,
    tags: parseJson<string[]>(row.tags) ?? [],
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
  };
}

const CONTACT_SCHEMA = `CREATE TABLE IF NOT EXISTS ${CONTACT_TABLE} (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  company TEXT,
  type TEXT,
  notes TEXT,
  tags TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

export function insertContactRow(
  db: CacheDatabase,
  c: Contact,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${CONTACT_TABLE} (id, name, email, phone, role,
       company, type, notes, tags,
       ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(c.id),
      val(c.name),
      val(c.email),
      val(c.phone),
      val(c.role),
      val(c.company),
      val(c.type),
      val(c.notes),
      json(c.tags ?? []),
      ...auditVals(c),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the contact cache entity. Call from initServices(). */
export function registerContactEntity(repo: ContactRepository): void {
  const entity: EntityDef = {
    table: CONTACT_TABLE,
    schema: CONTACT_SCHEMA,
    migrations: [
      `CREATE INDEX IF NOT EXISTS idx_contacts_company ON ${CONTACT_TABLE} (company)`,
      `CREATE INDEX IF NOT EXISTS idx_contacts_type ON ${CONTACT_TABLE} (type)`,
    ],
    fts: {
      type: "contact",
      columns: ["id", "name", "email", "role", "company", "notes"],
      titleCol: "name",
      contentCol: "notes",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAllFromDisk();
      for (const c of items) insertContactRow(db, c, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
