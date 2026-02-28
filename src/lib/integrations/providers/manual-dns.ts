/**
 * Manual (no-op) DNS provider — default when no integration is configured.
 * Pattern: Provider pattern — null-object implementation of DnsProvider.
 */

import type { DnsProvider, DnsSyncResult } from "./dns-provider.ts";

export class ManualDnsProvider implements DnsProvider {
  async fetchDomains(): Promise<DnsSyncResult[]> {
    return [];
  }
}
