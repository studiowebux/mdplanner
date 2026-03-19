import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { log } from "../singletons/logger.ts";

const COOKIE_NAME = "ui_state";

// deno-lint-ignore no-explicit-any
type Ctx = Context<any, any, any>;

function parseUiCookie(
  raw: string | undefined,
): Record<string, Record<string, unknown>> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      log.warn("UI state cookie is not an object, resetting");
      return {};
    }
    return parsed as Record<string, Record<string, unknown>>;
  } catch (err) {
    log.warn(`UI state cookie corrupted, resetting: ${err}`);
    return {};
  }
}

// Read a domain's saved UI state from the shared cookie.
export function readUiState<T>(c: Ctx, domain: string): Partial<T> {
  const all = parseUiCookie(getCookie(c, COOKIE_NAME));
  return (all[domain] ?? {}) as Partial<T>;
}

// Persist a domain's UI state into the shared cookie.
export function writeUiState<T>(c: Ctx, domain: string, state: T): void {
  const all = parseUiCookie(getCookie(c, COOKIE_NAME));
  all[domain] = state as Record<string, unknown>;
  setCookie(c, COOKIE_NAME, JSON.stringify(all), {
    path: "/",
    maxAge: 31536000,
    sameSite: "Lax",
  });
}

/** Get the current view mode for a domain — query param wins, then cookie, then fallback. */
export function getViewMode<T extends string = string>(
  c: Ctx,
  domain: string,
  fallback: T = "grid" as T,
): T {
  const fromQuery = c.req.query("view") as T | undefined;
  if (fromQuery) return fromQuery;
  const saved = readUiState<{ view?: string }>(c, domain);
  return (saved.view as T) ?? fallback;
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
