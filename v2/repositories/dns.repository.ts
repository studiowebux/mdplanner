// DNS domain repository — markdown file CRUD under dns/.

import type {
  CreateDnsDomain,
  DnsDomain,
  DnsRecord,
  UpdateDnsDomain,
} from "../types/dns.types.ts";
import { BaseMarkdownRepository } from "./base.repository.ts";

const BODY_KEYS = ["id", "notes"] as const;

export class DnsRepository extends BaseMarkdownRepository<
  DnsDomain,
  CreateDnsDomain,
  UpdateDnsDomain
> {
  constructor(projectDir: string) {
    super(projectDir, {
      directory: "dns",
      idPrefix: "dns",
      nameField: "domain",
    });
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
    const existing = await this.findByName(domainName);
    if (existing) {
      const updated = await this.update(existing.id, fields as UpdateDnsDomain);
      return { item: updated!, created: false };
    }
    const item = await this.create({
      domain: domainName,
      provider: "cloudflare",
      ...fields,
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
      createdAt: now,
      updatedAt: now,
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
      expiryDate: fm.expiryDate != null ? String(fm.expiryDate) : undefined,
      autoRenew: typeof fm.autoRenew === "boolean" ? fm.autoRenew : undefined,
      renewalCostUsd: typeof fm.renewalCostUsd === "number"
        ? fm.renewalCostUsd
        : undefined,
      provider: fm.provider != null ? String(fm.provider) : undefined,
      nameservers: Array.isArray(fm.nameservers)
        ? fm.nameservers.map(String)
        : undefined,
      dnsRecords: Array.isArray(fm.dnsRecords)
        ? (fm.dnsRecords as Record<string, unknown>[]).map((r) => ({
          type: String(r.type),
          name: String(r.name),
          value: String(r.value),
          ttl: Number(r.ttl),
          ...(r.proxied !== undefined ? { proxied: Boolean(r.proxied) } : {}),
        }))
        : undefined,
      status: fm.status != null ? String(fm.status) : undefined,
      lastFetchedAt: fm.lastFetchedAt != null
        ? String(fm.lastFetchedAt)
        : undefined,
      project: fm.project != null ? String(fm.project) : undefined,
      notes: body.trim() || undefined,
      createdAt: fm.created_at
        ? String(fm.created_at)
        : new Date().toISOString(),
      updatedAt: fm.updated_at
        ? String(fm.updated_at)
        : new Date().toISOString(),
      createdBy: fm.created_by != null ? String(fm.created_by) : undefined,
      updatedBy: fm.updated_by != null ? String(fm.updated_by) : undefined,
    };
  }

  protected serialize(item: DnsDomain): string {
    return this.serializeStandard(item, BODY_KEYS, item.notes ?? "");
  }
}
