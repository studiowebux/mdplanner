/**
 * Shared context and types for API routes.
 */

import { Context } from "hono";
import { type CacheLayer, ProjectManager } from "../../lib/project-manager.ts";
import { DirectoryMarkdownParser } from "../../lib/parser/directory/parser.ts";

export interface AppVariables {
  projectManager: ProjectManager;
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
