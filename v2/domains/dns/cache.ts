// DNS entity registration for SQLite cache.
// Called by initServices() after repos are created.

import { ENTITIES, json, val } from "../../database/sqlite/mod.ts";
import type { CacheDatabase, EntityDef } from "../../database/sqlite/mod.ts";
import type { DnsRepository } from "../../repositories/dns.repository.ts";
import type { DnsDomain } from "../../types/dns.types.ts";

const DNS_TABLE = "dns_domains";

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
       notes, last_fetched_at, project, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
