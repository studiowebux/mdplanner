/**
 * Directory-based parser for DNS domains.
 * Each domain is stored as a separate markdown file under dns/.
 */
import { buildFileContent, DirectoryParser, parseFrontmatter } from "./base.ts";
import type { DnsDomain, DnsRecord } from "../../types.ts";

interface DnsDnsRecord {
  type: string;
  name: string;
  value: string;
  ttl: number;
  proxied?: boolean;
}

interface DnsFrontmatter {
  id: string;
  domain: string;
  expiry_date?: string;
  auto_renew?: boolean;
  renewal_cost_usd?: number;
  provider?: string;
  nameservers?: string[];
  dns_records?: DnsDnsRecord[];
  status?: string;
  last_fetched_at?: string;
  project?: string;
  created: string;
  updated: string;
}

export class DnsDomainParser extends DirectoryParser<DnsDomain> {
  constructor(projectDir: string) {
    super({ projectDir, sectionName: "dns" });
  }

  protected parseFile(
    content: string,
    _filePath: string,
  ): DnsDomain | null {
    const { frontmatter, content: body } = parseFrontmatter<DnsFrontmatter>(
      content,
    );

    if (!frontmatter.id || !frontmatter.domain) return null;

    const dnsRecords: DnsRecord[] | undefined =
      frontmatter.dns_records && frontmatter.dns_records.length > 0
        ? frontmatter.dns_records.map((r) => ({
          type: r.type,
          name: r.name,
          value: r.value,
          ttl: r.ttl,
          proxied: r.proxied,
        }))
        : undefined;

    return {
      id: frontmatter.id,
      domain: frontmatter.domain,
      expiryDate: frontmatter.expiry_date,
      autoRenew: frontmatter.auto_renew,
      renewalCostUsd: frontmatter.renewal_cost_usd,
      provider: frontmatter.provider,
      nameservers: frontmatter.nameservers,
      dnsRecords,
      status: frontmatter.status,
      lastFetchedAt: frontmatter.last_fetched_at,
      project: frontmatter.project,
      notes: body.trim() || undefined,
      created: frontmatter.created || new Date().toISOString(),
      updated: frontmatter.updated || new Date().toISOString(),
    };
  }

  protected serializeItem(domain: DnsDomain): string {
    const frontmatter: DnsFrontmatter = {
      id: domain.id,
      domain: domain.domain,
      created: domain.created,
      updated: domain.updated,
    };

    if (domain.expiryDate) frontmatter.expiry_date = domain.expiryDate;
    if (domain.autoRenew !== undefined) {
      frontmatter.auto_renew = domain.autoRenew;
    }
    if (domain.renewalCostUsd !== undefined) {
      frontmatter.renewal_cost_usd = domain.renewalCostUsd;
    }
    if (domain.provider) frontmatter.provider = domain.provider;
    if (domain.nameservers && domain.nameservers.length > 0) {
      frontmatter.nameservers = domain.nameservers;
    }
    if (domain.dnsRecords && domain.dnsRecords.length > 0) {
      frontmatter.dns_records = domain.dnsRecords.map((r) => ({
        type: r.type,
        name: r.name,
        value: r.value,
        ttl: r.ttl,
        ...(r.proxied !== undefined ? { proxied: r.proxied } : {}),
      }));
    }
    if (domain.status) frontmatter.status = domain.status;
    if (domain.lastFetchedAt) {
      frontmatter.last_fetched_at = domain.lastFetchedAt;
    }
    if (domain.project) frontmatter.project = domain.project;

    return buildFileContent(frontmatter, domain.notes ?? "");
  }

  async add(
    domain: Omit<DnsDomain, "id" | "created" | "updated">,
  ): Promise<DnsDomain> {
    const now = new Date().toISOString();
    const newDomain: DnsDomain = {
      ...domain,
      id: this.generateId("dns"),
      created: now,
      updated: now,
    };
    await this.write(newDomain);
    return newDomain;
  }

  async update(
    id: string,
    updates: Partial<DnsDomain>,
  ): Promise<DnsDomain | null> {
    const existing = await this.read(id);
    if (!existing) return null;

    const updated: DnsDomain = {
      ...existing,
      ...updates,
      id: existing.id,
      domain: updates.domain ?? existing.domain,
      created: existing.created,
      updated: new Date().toISOString(),
    };
    await this.write(updated);
    return updated;
  }
}
