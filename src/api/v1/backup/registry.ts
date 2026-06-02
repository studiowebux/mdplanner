// Backup domain registry — each CRUD domain registers export + import handlers.
// Routes iterate getDomains() — adding a new domain is one registerDomain() call.

export interface DomainDescriptor {
  /** JSON key used in the backup file (e.g. "tasks", "goals"). */
  key: string;
  /** Human-readable label shown in import results. */
  label: string;
  /** Fetch all entities for export. */
  export(): Promise<unknown[]>;
  /** Upsert all items from a backup slice. Returns per-domain counts. */
  import(items: unknown[]): Promise<{ count: number; errors: string[] }>;
}

export interface ImportDomainResult {
  label: string;
  count: number;
  errors: string[];
}

export interface PreviewDomainResult {
  /** Domain key from the backup file. */
  key: string;
  /** Human-readable label, or the raw key for unknown domains. */
  label: string;
  /** Whether this domain key is registered (importable). */
  known: boolean;
  /** Number of records present for this domain in the backup. */
  backupCount: number;
  /** Records whose id does not exist in current data (would be created). */
  add: number;
  /** Records whose id already exists in current data (would be overwritten). */
  update: number;
}

export interface BackupPayload {
  version: string;
  exportedAt: string;
  domains: Record<string, unknown[]>;
}

const _registry = new Map<string, DomainDescriptor>();

export function registerDomain(d: DomainDescriptor): void {
  _registry.set(d.key, d);
}

export function getDomains(): DomainDescriptor[] {
  return [..._registry.values()];
}

export function getDomain(key: string): DomainDescriptor | undefined {
  return _registry.get(key);
}
