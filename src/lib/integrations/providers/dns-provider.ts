/**
 * DnsProvider interface — provider pattern for DNS registrar integrations.
 * Pattern: Provider pattern — define interface, implement per vendor.
 */

export interface DnsSyncedFields {
  /** ISO date string YYYY-MM-DD */
  expiryDate?: string;
  autoRenew?: boolean;
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
   * Returns only the fields the provider is allowed to sync per the sync contract.
   */
  fetchDomains(): Promise<DnsSyncResult[]>;
}
