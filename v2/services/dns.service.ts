// DNS service — orchestrates DnsRepository + Cloudflare sync via IDnsProvider.

import { CloudflareDnsProvider } from "../providers/cloudflare.ts";
import type { DnsRepository } from "../repositories/dns.repository.ts";
import type { ProjectService } from "./project.service.ts";
import type {
  CreateDnsDomain,
  DnsDomain,
  DnsRecord,
  IDnsProvider,
  UpdateDnsDomain,
} from "../types/dns.types.ts";

export class DnsService {
  constructor(
    private repo: DnsRepository,
    private projectService: ProjectService,
  ) {}

  async list(): Promise<DnsDomain[]> {
    return this.repo.findAll();
  }

  async getById(id: string): Promise<DnsDomain | null> {
    return this.repo.findById(id);
  }

  async getByDomain(domain: string): Promise<DnsDomain | null> {
    return this.repo.findByDomain(domain);
  }

  async create(data: CreateDnsDomain): Promise<DnsDomain> {
    return this.repo.create(data);
  }

  async update(id: string, data: UpdateDnsDomain): Promise<DnsDomain | null> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  // -------------------------------------------------------------------------
  // DNS record operations
  // -------------------------------------------------------------------------

  async addRecord(id: string, record: DnsRecord): Promise<DnsDomain | null> {
    return this.repo.addRecord(id, record);
  }

  async updateRecord(
    id: string,
    index: number,
    fields: Partial<DnsRecord>,
  ): Promise<DnsDomain | null> {
    return this.repo.updateRecord(id, index, fields);
  }

  async deleteRecord(id: string, index: number): Promise<DnsDomain | null> {
    return this.repo.deleteRecord(id, index);
  }

  // -------------------------------------------------------------------------
  // Cloudflare sync
  // -------------------------------------------------------------------------

  async syncCloudflare(): Promise<
    { synced: number; created: number; updated: number }
  > {
    const provider = await this.buildProvider();
    const results = await provider.fetchDomains();

    let created = 0;
    let updated = 0;

    for (const result of results) {
      const { created: isNew } = await this.repo.upsertByDomain(
        result.domain,
        result.synced,
      );
      if (isNew) created++;
      else updated++;
    }

    return { synced: results.length, created, updated };
  }

  private async buildProvider(): Promise<IDnsProvider> {
    const config = await this.projectService.getConfig();
    if (!config.cloudflareToken) {
      throw new Error(
        "CLOUDFLARE_TOKEN_MISSING: set the Cloudflare token in Settings > Project",
      );
    }
    return new CloudflareDnsProvider(config.cloudflareToken);
  }
}
