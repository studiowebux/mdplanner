// Shared helpers for MCP tool response formatting.

import { z } from "@hono/zod-openapi";

export function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function err(message: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}

/**
 * Canonical `slim` list-tool param. Shared so every list_* tool (factory and
 * hand-written) documents the option identically. `slim: true` returns a
 * compact projection instead of full records, cutting agent token usage.
 */
export const slimParam = z.boolean().optional().describe(
  "Return a compact projection (id + key fields) instead of full records. Use when browsing.",
);

/**
 * Project each entity down to `{ id, ...fields }`. `id` is always included —
 * pass only the additional fields. Used by registerCrudTools and bespoke list
 * tools so slim output is shaped identically everywhere. Fields absent on an
 * item serialize as undefined → dropped by JSON; choose real entity fields.
 */
export function projectSlim<T extends { id: string }>(
  items: T[],
  fields: Array<keyof T & string>,
): Array<Record<string, unknown>> {
  return items.map((item) => {
    const row = item as Record<string, unknown>;
    const out: Record<string, unknown> = { id: row.id };
    for (const f of fields) out[f] = row[f];
    return out;
  });
}
