// DNS service — orchestrates DnsRepository + Cloudflare sync via IDnsProvider.

import { CloudflareDnsProvider } from "../providers/cloudflare.ts";
import { publish } from "../singletons/event-bus.ts";
import type { DnsRepository } from "../repositories/dns.repository.ts";
import type { ProjectService } from "./project.service.ts";
import type {
  CreateDnsDomain,
  DnsDomain,
  DnsRecord,
  IDnsProvider,
  UpdateDnsDomain,
} from "../types/dns.types.ts";

/** DNS service (no base repository): domain CRUD plus per-record add/update/delete and Cloudflare sync (syncCloudflare). */
export class DnsService {
  constructor(
    private repo: DnsRepository,
    private projectService: ProjectService,
  ) {}

  // No BaseService here (no standard repo), so publish the SSE refresh event
  // directly — same contract as BaseService.publishChange, prefix = "dns".
  private publishChange(event: "updated" | "deleted" = "updated"): void {
    publish(`dns.${event}`);
  }

  async list(): Promise<DnsDomain[]> {
    return this.repo.findAll();
  }

  async getById(id: string): Promise<DnsDomain | null> {
    return this.repo.findById(id);
  }

  async getByName(domain: string): Promise<DnsDomain | null> {
    return this.repo.findByName(domain);
  }

  async create(data: CreateDnsDomain): Promise<DnsDomain> {
    const created = await this.repo.create(data);
    this.publishChange();
    return created;
  }

  async update(id: string, data: UpdateDnsDomain): Promise<DnsDomain | null> {
    const updated = await this.repo.update(id, data);
    if (updated) this.publishChange();
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.repo.delete(id);
    if (deleted) this.publishChange("deleted");
    return deleted;
  }

  // -------------------------------------------------------------------------
  // DNS record operations
  // -------------------------------------------------------------------------

  async addRecord(id: string, record: DnsRecord): Promise<DnsDomain | null> {
    const result = await this.repo.addRecord(id, record);
    if (result) this.publishChange();
    return result;
  }

  async updateRecord(
    id: string,
    index: number,
    fields: Partial<DnsRecord>,
  ): Promise<DnsDomain | null> {
    const result = await this.repo.updateRecord(id, index, fields);
    if (result) this.publishChange();
    return result;
  }

  async deleteRecord(id: string, index: number): Promise<DnsDomain | null> {
    const result = await this.repo.deleteRecord(id, index);
    if (result) this.publishChange();
    return result;
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

    publish("dns.synced");
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
