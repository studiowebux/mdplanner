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
