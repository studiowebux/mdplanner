// DNS domain repository — markdown file CRUD under dns/.

import { join } from "@std/path";
import {
  parseFrontmatter,
  serializeFrontmatter,
} from "../utils/frontmatter.ts";
import { generateId } from "../utils/id.ts";
import { atomicWrite, SafeWriter } from "../utils/safe-io.ts";
import {
  buildFrontmatter,
  mergeFields,
  readMarkdownDir,
} from "../utils/repo-helpers.ts";
import type {
  CreateDnsDomain,
  DnsDomain,
  DnsRecord,
  UpdateDnsDomain,
} from "../types/dns.types.ts";

const BODY_KEYS = ["id", "notes"] as const;

export class DnsRepository {
  private dir: string;
  private writer = new SafeWriter();

  constructor(projectDir: string) {
    this.dir = join(projectDir, "dns");
  }

  async findAll(): Promise<DnsDomain[]> {
    const items = await readMarkdownDir(this.dir, (filename, fm, body) =>
      this.parse(filename, fm, body)
    );
    return items.sort((a, b) => a.domain.localeCompare(b.domain));
  }

  async findById(id: string): Promise<DnsDomain | null> {
    try {
      const content = await Deno.readTextFile(join(this.dir, `${id}.md`));
      const { frontmatter, body } = parseFrontmatter(content);
      return this.parse(`${id}.md`, frontmatter, body);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return null;
      throw err;
    }
  }

  async findByDomain(domain: string): Promise<DnsDomain | null> {
    const all = await this.findAll();
    return all.find((d) =>
      d.domain.toLowerCase() === domain.toLowerCase()
    ) ?? null;
  }

  async create(data: CreateDnsDomain): Promise<DnsDomain> {
    await Deno.mkdir(this.dir, { recursive: true });
    const now = new Date().toISOString();
    const id = generateId("dns");

    const item: DnsDomain = {
      ...data,
      id,
      created: now,
      updated: now,
    };

    const filePath = join(this.dir, `${id}.md`);
    await this.writer.write(
      id,
      () => atomicWrite(filePath, this.serialize(item)),
    );
    return item;
  }

  async update(id: string, data: UpdateDnsDomain): Promise<DnsDomain | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = mergeFields(
      { ...existing },
      data as Record<string, unknown>,
    );
    updated.updated = new Date().toISOString();

    await this.writer.write(
      id,
      () => atomicWrite(join(this.dir, `${id}.md`), this.serialize(updated)),
    );
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    try {
      await Deno.remove(join(this.dir, `${id}.md`));
      return true;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) return false;
      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // DNS record operations (index-based, inline in domain frontmatter)
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Sync helpers — used by DnsService for Cloudflare upsert
  // -------------------------------------------------------------------------

  async upsertByDomain(
    domainName: string,
    fields: Partial<DnsDomain>,
  ): Promise<{ item: DnsDomain; created: boolean }> {
    const existing = await this.findByDomain(domainName);
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

  // -------------------------------------------------------------------------
  // Parse / Serialize
  // -------------------------------------------------------------------------

  private parse(
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
      autoRenew: typeof fm.autoRenew === "boolean"
        ? fm.autoRenew
        : undefined,
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
      created: fm.created ? String(fm.created) : new Date().toISOString(),
      updated: fm.updated ? String(fm.updated) : new Date().toISOString(),
    };
  }

  private serialize(item: DnsDomain): string {
    const fm = buildFrontmatter(
      item as unknown as Record<string, unknown>,
      BODY_KEYS,
    );
    return serializeFrontmatter(fm, item.notes ?? "");
  }
}
