// DNS domain repository — markdown file CRUD under dns/.

import type {
  CreateDnsDomain,
  DnsDomain,
  DnsRecord,
  UpdateDnsDomain,
} from "../types/dns.types.ts";
import { CachedMarkdownRepository } from "./cached.repository.ts";
import { DNS_TABLE, rowToDnsDomain } from "../domains/dns/cache.ts";
import { DNS_BODY_KEYS } from "../domains/dns/constants.ts";

import {
  fmBool,
  fmNum,
  fmStr,
  fmStrArr,
  stampAuditFields,
} from "../utils/frontmatter-mapper.ts";
/** Persists DNS domains as markdown with a SQLite cache mirror; records are managed in the body (add/update/deleteRecord, upsertByDomain). */
export class DnsRepository extends CachedMarkdownRepository<
  DnsDomain,
  CreateDnsDomain,
  UpdateDnsDomain
> {
  protected readonly tableName = DNS_TABLE;
  protected override readonly supportsArchive = true;

  constructor(projectDir: string) {
    super(projectDir, {
      directory: "dns",
      idPrefix: "dns",
      nameField: "domain",
    });
  }

  protected rowToEntity(
    row: Record<string, string | number | null>,
  ): DnsDomain {
    return rowToDnsDomain(row);
  }

  // ---------------------------------------------------------------------------
  // DNS record operations (index-based, inline in domain frontmatter)
  // ---------------------------------------------------------------------------

  async addRecord(id: string, record: DnsRecord): Promise<DnsDomain | null> {
    const domain = await this.findById(id);
    if (!domain) return null;
    const records = [...(domain.dnsRecords ?? []), record];
    return this.update(id, { dnsRecords: records } as UpdateDnsDomain);
  }

  async updateRecord(
    id: string,
    index: number,
    fields: Partial<DnsRecord>,
  ): Promise<DnsDomain | null> {
    const domain = await this.findById(id);
    if (!domain) return null;
    const records = [...(domain.dnsRecords ?? [])];
    if (index < 0 || index >= records.length) return null;
    records[index] = { ...records[index], ...fields };
    return this.update(id, { dnsRecords: records } as UpdateDnsDomain);
  }

  async deleteRecord(id: string, index: number): Promise<DnsDomain | null> {
    const domain = await this.findById(id);
    if (!domain) return null;
    const records = [...(domain.dnsRecords ?? [])];
    if (index < 0 || index >= records.length) return null;
    records.splice(index, 1);
    return this.update(id, { dnsRecords: records } as UpdateDnsDomain);
  }

  // ---------------------------------------------------------------------------
  // Sync helpers — used by DnsService for Cloudflare upsert
  // ---------------------------------------------------------------------------

  async upsertByDomain(
    domainName: string,
    fields: Partial<DnsDomain>,
  ): Promise<{ item: DnsDomain; created: boolean }> {
    // Cloudflare-sourced upsert: the record's provider is known, so set/override
    // it to "cloudflare" on both create and update (an existing manually-entered
    // provider on a domain that also lives in Cloudflare is corrected to match).
    const withProvider = { ...fields, provider: "cloudflare" };
    const existing = await this.findByName(domainName);
    if (existing) {
      const updated = await this.update(
        existing.id,
        withProvider as UpdateDnsDomain,
      );
      return { item: updated!, created: false };
    }
    const item = await this.create({
      domain: domainName,
      ...withProvider,
    } as CreateDnsDomain);
    return { item, created: true };
  }

  // ---------------------------------------------------------------------------
  // Parse / Serialize
  // ---------------------------------------------------------------------------

  protected fromCreateInput(
    data: CreateDnsDomain,
    id: string,
    now: string,
  ): DnsDomain {
    return {
      ...data,
      id,
      ...stampAuditFields(now),
    };
  }

  protected parse(
    filename: string,
    fm: Record<string, unknown>,
    body: string,
  ): DnsDomain | null {
    if (!fm.domain) return null;
    const id = filename.replace(/\.md$/, "");

    return {
      id,
      domain: String(fm.domain),
      expiryDate: fmStr(fm, "expiryDate"),
      autoRenew: fmBool(fm, "autoRenew"),
      renewalCostUsd: fmNum(fm, "renewalCostUsd"),
      provider: fmStr(fm, "provider"),
      nameservers: fmStrArr(fm, "nameservers"),
      dnsRecords: Array.isArray(fm.dnsRecords)
        ? (fm.dnsRecords as Record<string, unknown>[]).map((r) => ({
          type: String(r.type),
          name: String(r.name),
          value: String(r.value),
          ttl: Number(r.ttl),
          ...(r.proxied !== undefined ? { proxied: Boolean(r.proxied) } : {}),
        }))
        : undefined,
      status: fmStr(fm, "status"),
      lastFetchedAt: fmStr(fm, "lastFetchedAt"),
      project: fmStr(fm, "project"),
      notes: body.trim() || undefined,
      createdAt: fmStr(fm, "createdAt") ?? new Date().toISOString(),
      updatedAt: fmStr(fm, "updatedAt") ?? new Date().toISOString(),
      createdBy: fmStr(fm, "createdBy"),
      updatedBy: fmStr(fm, "updatedBy"),
    };
  }

  protected serialize(item: DnsDomain): string {
    return this.serializeStandard(item, DNS_BODY_KEYS, item.notes ?? "");
  }
}
