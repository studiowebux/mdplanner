// Request-scoped UI state: global project/assignee filters and view prefs.
import { getCookie, setCookie } from "hono/cookie";
import { parseJson } from "../database/sqlite/mod.ts";
import type { AppContext } from "../types/app.ts";

const COOKIE_NAME = "ui_state";

function parseUiCookie(
  raw: string | undefined,
): Record<string, Record<string, unknown>> {
  if (!raw) return {};
  const parsed = parseJson<Record<string, Record<string, unknown>>>(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed;
}

// Read a domain's saved UI state from the shared cookie.
export function readUiState<T>(c: AppContext, domain: string): Partial<T> {
  const all = parseUiCookie(getCookie(c, COOKIE_NAME));
  return (all[domain] ?? {}) as Partial<T>;
}

// Persist a domain's UI state into the shared cookie.
export function writeUiState<T>(c: AppContext, domain: string, state: T): void {
  const all = parseUiCookie(getCookie(c, COOKIE_NAME));
  all[domain] = state as Record<string, unknown>;
  setCookie(c, COOKIE_NAME, JSON.stringify(all), {
    path: "/",
    maxAge: 31536000,
    sameSite: "Lax",
    httpOnly: true,
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
export function writeGlobalFilters(
  c: AppContext,
  projects: string[],
  assignees: string[],
): void {
  writeUiState(c, GLOBAL_KEY, {
    globalProjects: projects,
    globalAssignees: assignees,
  });
}

// Delete specific keys from a domain's saved UI state, leaving everything else intact.
export function deleteUiStateKeys(
  c: AppContext,
  domain: string,
  keys: string[],
): void {
  const saved = readUiState<Record<string, unknown>>(c, domain);
  for (const key of keys) delete saved[key];
  writeUiState(c, domain, saved);
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
