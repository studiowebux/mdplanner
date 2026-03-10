/**
 * Search API Routes
 * Pattern: Controller pattern - handles search and cache operations
 *
 * Provides full-text search and cache management endpoints.
 * Requires cache to be enabled (--cache flag).
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  type AppVariables,
  getCache,
  getProjectManager,
  isCacheEnabled,
} from "./context.ts";

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const SuccessSchema = z.object({ success: z.boolean() });

const searchRouter = new OpenAPIHono<{ Variables: AppVariables }>();

// --- Route definitions ---

const searchRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Search"],
  summary: "Full-text search across entities",
  operationId: "search",
  request: {
    query: z.object({
      q: z.string().optional().openapi({
        description: "Search query",
      }),
      limit: z.string().optional().openapi({
        description: "Max results (1-100, default 50)",
      }),
      offset: z.string().optional().openapi({
        description: "Results offset",
      }),
      types: z.string().optional().openapi({
        description: "Comma-separated entity types to search",
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Search results",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Bad request",
    },
  },
});

const searchStatsRoute = createRoute({
  method: "get",
  path: "/stats",
  tags: ["Search"],
  summary: "Cache statistics and counts",
  operationId: "getSearchStats",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Cache statistics",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Cache not enabled",
    },
  },
});

const searchStatusRoute = createRoute({
  method: "get",
  path: "/status",
  tags: ["Search"],
  summary: "Cache status",
  operationId: "getSearchStatus",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Cache status",
    },
  },
});

const rebuildCacheRoute = createRoute({
  method: "post",
  path: "/rebuild",
  tags: ["Search"],
  summary: "Rebuild cache from markdown",
  operationId: "rebuildSearchCache",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Rebuild result",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Cache not enabled",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Rebuild failed",
    },
  },
});

const syncCacheRoute = createRoute({
  method: "post",
  path: "/sync",
  tags: ["Search"],
  summary: "Sync cache (full sync)",
  operationId: "syncSearchCache",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Sync result",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Cache not enabled",
    },
  },
});

// --- Handlers ---

// GET /search - Full-text search across entities
searchRouter.openapi(searchRoute, async (c) => {
  const cache = getCache(c);
  if (!cache) {
    return c.json(
      { error: "Cache is not enabled. Start server with --cache flag." },
      400,
    );
  }

  const { q: query, limit: limitParam, offset: offsetParam, types: typesParam } =
    c.req.valid("query");
  if (!query || query.trim().length === 0) {
    return c.json({ error: "Query parameter 'q' is required" }, 400);
  }
  if (query.length > 1000) {
    return c.json({ error: "Query too long (max 1000 characters)" }, 400);
  }

  const limit = limitParam
    ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 50))
    : 50;
  const offset = offsetParam
    ? Math.max(0, parseInt(offsetParam, 10) || 0)
    : 0;
  const types = typesParam?.split(",").filter(Boolean) as
    | ("task" | "note" | "goal" | "idea" | "meeting" | "person")[]
    | undefined;

  const results = cache.search.search(query, { limit, offset, types });

  return c.json({
    query,
    count: results.length,
    results,
  }, 200);
});

// GET /search/stats - Cache statistics and counts
searchRouter.openapi(searchStatsRoute, async (c) => {
  const cache = getCache(c);
  if (!cache) {
    return c.json(
      { error: "Cache is not enabled. Start server with --cache flag." },
      400,
    );
  }

  const stats = cache.search.getStats();
  const lastSync = cache.sync.getLastSyncTime();

  return c.json({
    ...stats,
    lastSync: lastSync?.toISOString() ?? null,
    cacheEnabled: true,
  }, 200);
});

// GET /search/status - Cache status
searchRouter.openapi(searchStatusRoute, async (c) => {
  const enabled = isCacheEnabled(c);

  if (!enabled) {
    return c.json({
      enabled: false,
      message: "Cache is not enabled. Start server with --cache flag.",
    }, 200);
  }

  const cache = getCache(c);
  const lastSync = cache?.sync.getLastSyncTime();
  const needsSync = cache?.sync.needsSync() ?? true;

  return c.json({
    enabled: true,
    needsSync,
    lastSync: lastSync?.toISOString() ?? null,
    dbPath: cache?.db.getPath() ?? null,
  }, 200);
});

// POST /search/rebuild - Rebuild cache from markdown
searchRouter.openapi(rebuildCacheRoute, async (c) => {
  const pm = getProjectManager(c);

  if (!pm.isCacheEnabled()) {
    return c.json(
      { error: "Cache is not enabled. Start server with --cache flag." },
      400,
    );
  }

  const result = await pm.rebuildCache();

  if (!result) {
    return c.json({ error: "Failed to rebuild cache." }, 500);
  }

  return c.json({
    success: true,
    tables: result.tables,
    items: result.items,
    duration: result.duration,
    errors: result.errors.length > 0 ? result.errors : undefined,
  }, 200);
});

// POST /search/sync - Sync cache (full sync)
searchRouter.openapi(syncCacheRoute, async (c) => {
  const cache = getCache(c);
  if (!cache) {
    return c.json(
      { error: "Cache is not enabled. Start server with --cache flag." },
      400,
    );
  }

  const result = await cache.sync.fullSync();

  return c.json({
    success: true,
    tables: result.tables,
    items: result.items,
    duration: result.duration,
    errors: result.errors.length > 0 ? result.errors : undefined,
  }, 200);
});

export { searchRouter };
