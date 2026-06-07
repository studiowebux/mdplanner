// Request-scoped UI state: global project/assignee filters and per-domain view
// prefs. Persisted per-user in PersonPreferences.uiState (backend store, keyed
// by the resolved activePerson), NOT a cookie. The former single ui_state
// cookie crammed every domain into one ~4KB blob and silently truncated once
// enough domains accumulated state.
//
// Reads are sync: activePerson is loaded once per request by contextMiddleware,
// so its preferences are already in memory. Writes are async: they patch
// person.preferences.uiState via the people service (one-level-deep per-domain
// merge — a write to one domain leaves the others untouched).
import { getPeopleService } from "../singletons/services.ts";
import type { AppContext } from "../types/app.ts";

// One domain's UI state: string view/sort values or string-array multi-selects.
type DomainUiState = Record<string, string | string[]>;

// Read a domain's saved UI state from the active person's preferences.
export function readUiState<T>(c: AppContext, domain: string): Partial<T> {
  const all: Record<string, Record<string, unknown>> =
    c.var.activePerson?.preferences?.uiState ?? {};
  return (all[domain] ?? {}) as Partial<T>;
}

// Persist a domain's UI state into the active person's preferences. No-op when
// there is no person to scope to (anonymous request with no human fallback).
export async function writeUiState(
  c: AppContext,
  domain: string,
  state: DomainUiState,
): Promise<void> {
  const personId = c.var.activePerson?.id;
  if (!personId) return;
  await getPeopleService().updatePreferences(personId, {
    uiState: { [domain]: state },
  });
}

type GlobalUiState = { globalProjects?: string[]; globalAssignees?: string[] };

const GLOBAL_KEY = "_global";

/** Read the active global project filter from request UI state. */
export function readGlobalProjects(c: AppContext): string[] {
  const g = readUiState<GlobalUiState>(c, GLOBAL_KEY);
  return g.globalProjects ?? [];
}

/** Read the active global assignee filter from request UI state. */
export function readGlobalAssignees(c: AppContext): string[] {
  const g = readUiState<GlobalUiState>(c, GLOBAL_KEY);
  return g.globalAssignees ?? [];
}

/** Persist the global project/assignee filters into request UI state. */
export async function writeGlobalFilters(
  c: AppContext,
  projects: string[],
  assignees: string[],
): Promise<void> {
  await writeUiState(c, GLOBAL_KEY, {
    globalProjects: projects,
    globalAssignees: assignees,
  });
}

// Delete specific keys from a domain's saved UI state, leaving everything else intact.
export async function deleteUiStateKeys(
  c: AppContext,
  domain: string,
  keys: string[],
): Promise<void> {
  const saved = readUiState<DomainUiState>(c, domain);
  const next: DomainUiState = {};
  for (const [key, value] of Object.entries(saved)) {
    if (!keys.includes(key) && value !== undefined) next[key] = value;
  }
  await writeUiState(c, domain, next);
}

// Merge query params over saved state. Params take precedence when present.
export function mergeParams(
  params: Record<string, string | undefined>,
  saved: Record<string, unknown>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys({ ...saved, ...params })) {
    const param = params[key];
    const cookie = saved[key];
    result[key] = param ?? String(cookie ?? "");
  }
  return result;
}
