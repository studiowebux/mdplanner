// DNS entity registration for SQLite cache.
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
import type { DnsRepository } from "../../repositories/dns.repository.ts";
import type { DnsDomain } from "../../types/dns.types.ts";

export const DNS_TABLE = "dns_domains";

/** Deserialize a SQLite row to a DnsDomain. */
export function rowToDnsDomain(row: Record<string, unknown>): DnsDomain {
  return {
    id: row.id as string,
    domain: (row.domain as string) ?? "",
    provider: row.provider as string | undefined,
    status: (row.status as DnsDomain["status"]) ?? "active",
    expiryDate: row.expiry_date as string | undefined,
    autoRenew: row.auto_renew != null ? Boolean(row.auto_renew) : undefined,
    renewalCostUsd: row.renewal_cost_usd != null
      ? Number(row.renewal_cost_usd)
      : undefined,
    nameservers: parseJson<string[]>(row.nameservers),
    dnsRecords: parseJson(row.dns_records),
    notes: row.notes as string | undefined,
    lastFetchedAt: row.last_fetched_at as string | undefined,
    project: row.project as string | undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    updatedAt: (row.updated_at as string) ?? new Date().toISOString(),
    createdBy: row.created_by != null ? row.created_by as string : undefined,
    updatedBy: row.updated_by != null ? row.updated_by as string : undefined,
  };
}

const DNS_SCHEMA = `CREATE TABLE IF NOT EXISTS ${DNS_TABLE} (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  provider TEXT,
  status TEXT,
  expiry_date TEXT,
  auto_renew INTEGER,
  renewal_cost_usd REAL,
  nameservers TEXT,
  dns_records TEXT,
  notes TEXT,
  last_fetched_at TEXT,
  project TEXT,
  created_at TEXT,
  updated_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  synced_at TEXT
)`;

function insertDnsRow(
  db: CacheDatabase,
  d: DnsDomain,
  syncedAt?: string,
): void {
  db.execute(
    `INSERT OR REPLACE INTO ${DNS_TABLE} (id, domain, provider, status,
       expiry_date, auto_renew, renewal_cost_usd, nameservers, dns_records,
       notes, last_fetched_at, project, ${auditCols()}, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      val(d.id),
      val(d.domain),
      val(d.provider),
      val(d.status),
      val(d.expiryDate),
      d.autoRenew != null ? (d.autoRenew ? 1 : 0) : null,
      d.renewalCostUsd ?? null,
      json(d.nameservers),
      json(d.dnsRecords),
      val(d.notes),
      val(d.lastFetchedAt),
      val(d.project),
      ...auditVals(d),
      syncedAt ?? new Date().toISOString(),
    ],
  );
}

/** Register the DNS cache entity. Call from initServices(). */
export function registerDnsEntity(repo: DnsRepository): void {
  const entity: EntityDef = {
    table: DNS_TABLE,
    schema: DNS_SCHEMA,
    fts: {
      type: "dns_domain",
      columns: ["id", "domain", "notes"],
      titleCol: "domain",
      contentCol: "notes",
    },
    sync: async (db, syncedAt) => {
      const items = await repo.findAll();
      for (const d of items) insertDnsRow(db, d, syncedAt);
      return items.length;
    },
  };
  ENTITIES.push(entity);
}
