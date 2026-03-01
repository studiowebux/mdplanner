/**
 * DnsProvider interface — provider pattern for DNS registrar integrations.
 * Pattern: Provider pattern — define interface, implement per vendor.
 */

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  ttl: number;
  proxied?: boolean;
}

export interface DnsSyncedFields {
  /** ISO date string YYYY-MM-DD */
  expiryDate?: string;
  autoRenew?: boolean;
  /** Nameservers from the DNS zone */
  nameservers?: string[];
  /** DNS records from the zone */
  dnsRecords?: DnsRecord[];
  /** Zone status (e.g. "active") */
  status?: string;
  /** ISO timestamp of when the sync was performed */
  lastFetchedAt: string;
}

export interface DnsSyncResult {
  /** Domain name (e.g. "example.com") */
  domain: string;
  synced: DnsSyncedFields;
}

export interface DnsProvider {
  /**
   * Fetch all domains managed by this provider.
   * Returns all fields the provider can supply.
   */
  fetchDomains(): Promise<DnsSyncResult[]>;
}
