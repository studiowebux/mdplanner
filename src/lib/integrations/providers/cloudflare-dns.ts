/**
 * Cloudflare Registrar DNS provider.
 * Pattern: Provider pattern — implements DnsProvider for Cloudflare.
 *
 * Sync contract (enforced here, not just in UI):
 *   Only expiryDate, autoRenew, and lastFetchedAt are written per domain.
 *   renewalCostUsd, notes, domain name, id, and provider are never touched.
 *
 * Cloudflare notes:
 *   - expires_at is only populated for CF Registrar domains (not DNS-only zones)
 *   - Renewal price is not in CF API — always manual
 *   - Account ID is auto-fetched via GET /accounts on first use
 */

import type { DnsProvider, DnsSyncResult } from "./dns-provider.ts";

const CF_API = "https://api.cloudflare.com/client/v4";

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

  async fetchDomains(): Promise<DnsSyncResult[]> {
    const accountId = await this.resolveAccountId();
    // deno-lint-ignore no-explicit-any
    const data = await this.cfGet(
      `/accounts/${accountId}/registrar/domains`,
    ) as any;

    const cfDomains: {
      name: string;
      expires_at?: string;
      auto_renew?: boolean;
    }[] = data?.result ?? [];

    const now = new Date().toISOString();

    return cfDomains.map((d) => ({
      domain: d.name,
      synced: {
        expiryDate: d.expires_at ? d.expires_at.split("T")[0] : undefined,
        autoRenew: d.auto_renew,
        lastFetchedAt: now,
      },
    }));
  }
}
