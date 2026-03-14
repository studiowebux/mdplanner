/**
 * Shared context and types for API routes.
 */

import { Context } from "hono";
import { type CacheLayer, ProjectManager } from "../../lib/project-manager.ts";
import { DirectoryMarkdownParser } from "../../lib/parser/directory/parser.ts";
import type { CerveauReader } from "../../lib/cerveau/reader.ts";

export interface AppVariables {
  projectManager: ProjectManager;
  cerveauReader?: CerveauReader;
}

export type AppContext = Context<{ Variables: AppVariables }>;

export function getParser(c: AppContext): DirectoryMarkdownParser {
  return c.get("projectManager").getActiveParser();
}

export function getProjectManager(c: AppContext): ProjectManager {
  return c.get("projectManager");
}

export function getCache(c: AppContext): CacheLayer | null {
  return c.get("projectManager").getCache();
}

export function isCacheEnabled(c: AppContext): boolean {
  return c.get("projectManager").isCacheEnabled();
}

export function isReadOnly(c: AppContext): boolean {
  return c.get("projectManager").isReadOnly();
}

/**
 * Write-through helper: re-sync one table after a create/update mutation.
 * No-op when cache is disabled. Safe to await — never throws.
 */
export async function cacheWriteThrough(
  c: AppContext,
  table: string,
): Promise<void> {
  return getProjectManager(c).writeThrough(table);
}

/**
 * Purge helper: remove one row after a delete mutation.
 * No-op when cache is disabled. Never throws.
 */
export function cachePurge(c: AppContext, table: string, id: string): void {
  getProjectManager(c).purge(table, id);
}

export const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

export function errorResponse(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: corsHeaders,
  });
}

/**
 * Optimistic locking helper.
 * Returns a 409 Conflict response when the client's `requestedUpdatedAt` is
 * older than the server's `storedUpdatedAt`, indicating the entity was modified
 * after the client last read it. Returns null when there is no conflict.
 *
 * Usage in a PUT handler:
 *   const existing = await parser.readNote(id);
 *   const conflict = checkConflict(existing?.updatedAt, body.updatedAt);
 *   if (conflict) return conflict;
 */
export function checkConflict(
  storedUpdatedAt: string | undefined,
  requestedUpdatedAt: string | undefined,
): Response | null {
  if (!storedUpdatedAt || !requestedUpdatedAt) return null;
  const stored = new Date(storedUpdatedAt).getTime();
  const requested = new Date(requestedUpdatedAt).getTime();
  if (stored > requested) {
    return jsonResponse(
      { error: "Conflict", serverUpdatedAt: storedUpdatedAt },
      409,
    );
  }
  return null;
}


