/**
 * Cloudflare DNS provider.
 * Pattern: Provider pattern — implements DnsProvider for Cloudflare.
 *
 * Sync strategy:
 *   1. Fetch all zones via GET /zones (covers DNS-only zones, not just registrar domains)
 *   2. Fetch DNS records per zone via GET /zones/{id}/dns_records
 *   3. Optionally enrich with Registrar data (expiry, auto_renew) via
 *      GET /accounts/{accountId}/registrar/domains/{domain} — graceful 404 skip
 *
 * Required token permissions:
 *   Zone:Read, Zone DNS:Read, Registrar:Read (optional, for expiry/auto-renew data)
 *
 * Note: expires_at and auto_renew are only available for domains registered
 * through Cloudflare Registrar. DNS-only zones will not have these fields.
 */

import type { DnsProvider, DnsRecord, DnsSyncResult } from "./dns-provider.ts";

const CF_API = "https://api.cloudflare.com/client/v4";

interface CfZone {
  id: string;
  name: string;
  status: string;
  name_servers: string[];
}

interface CfDnsRecord {
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
}

interface CfRegistrarDomain {
  name: string;
  expires_at?: string;
  auto_renew?: boolean;
}

export class CloudflareDnsProvider implements DnsProvider {
  private token: string;
  private accountId: string | null = null;

  constructor(token: string) {
    this.token = token;
  }

  private async cfGet(path: string): Promise<unknown> {
    const res = await fetch(`${CF_API}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Cloudflare API error ${res.status}: ${text}`);
    }
    return res.json();
  }

  private async resolveAccountId(): Promise<string> {
    if (this.accountId) return this.accountId;
    // deno-lint-ignore no-explicit-any
    const data = await this.cfGet("/accounts") as any;
    const accounts: { id: string; name: string }[] = data?.result ?? [];
    if (accounts.length === 0) {
      throw new Error("No Cloudflare accounts found for this token");
    }
    // Use the first account; multi-account setups are not supported
    this.accountId = accounts[0].id;
    return this.accountId;
  }

  private async fetchAllZones(): Promise<CfZone[]> {
    const perPage = 50;
    let page = 1;
    let totalPages = 1;
    const zones: CfZone[] = [];

    do {
      // deno-lint-ignore no-explicit-any
      const data = await this.cfGet(
        `/zones?page=${page}&per_page=${perPage}`,
      ) as any;
      const results: CfZone[] = data?.result ?? [];
      zones.push(...results);

      const info = data?.result_info;
      if (info?.total_count && info?.per_page) {
        totalPages = Math.ceil(info.total_count / info.per_page);
      }
      page++;
    } while (page <= totalPages);

    return zones;
  }

  private async fetchDnsRecords(zoneId: string): Promise<DnsRecord[]> {
    try {
      // deno-lint-ignore no-explicit-any
      const data = await this.cfGet(
        `/zones/${zoneId}/dns_records?per_page=100`,
      ) as any;
      const raw: CfDnsRecord[] = data?.result ?? [];
      return raw.map((r) => ({
        type: r.type,
        name: r.name,
        value: r.content,
        ttl: r.ttl,
        proxied: r.proxied,
      }));
    } catch {
      // Non-fatal: return empty if DNS records fetch fails (e.g. missing permission)
      return [];
    }
  }

  private async fetchRegistrarDomain(
    accountId: string,
    domainName: string,
  ): Promise<CfRegistrarDomain | null> {
    try {
      // deno-lint-ignore no-explicit-any
      const data = await this.cfGet(
        `/accounts/${accountId}/registrar/domains/${domainName}`,
      ) as any;
      return (data?.result ?? null) as CfRegistrarDomain | null;
    } catch {
      // Graceful skip — domain not registered through CF Registrar, or missing permission
      return null;
    }
  }

  async fetchDomains(): Promise<DnsSyncResult[]> {
    const accountId = await this.resolveAccountId();
    const zones = await this.fetchAllZones();
    const now = new Date().toISOString();

    return Promise.all(
      zones.map(async (zone) => {
        const [dnsRecords, registrar] = await Promise.all([
          this.fetchDnsRecords(zone.id),
          this.fetchRegistrarDomain(accountId, zone.name),
        ]);

        return {
          domain: zone.name,
          synced: {
            status: zone.status,
            nameservers: zone.name_servers,
            dnsRecords,
            expiryDate: registrar?.expires_at
              ? registrar.expires_at.split("T")[0]
              : undefined,
            autoRenew: registrar?.auto_renew,
            lastFetchedAt: now,
          },
        };
      }),
    );
  }
}
