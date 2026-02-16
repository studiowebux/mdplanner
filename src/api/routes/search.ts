/**
 * Search API Routes
 * Pattern: Controller pattern - handles search and cache operations
 *
 * Provides full-text search and cache management endpoints.
 * Requires cache to be enabled (--cache flag).
 */

import { Hono } from "hono";
import {
  type AppVariables,
  errorResponse,
  getCache,
  getProjectManager,
  isCacheEnabled,
  jsonResponse,
} from "./context.ts";

const searchRouter = new Hono<{ Variables: AppVariables }>();

// GET /search - Full-text search across entities
searchRouter.get("/", async (c) => {
  const cache = getCache(c);
  if (!cache) {
    return errorResponse(
      "Cache is not enabled. Start server with --cache flag.",
      400,
    );
  }

  const query = c.req.query("q");
  if (!query || query.trim().length === 0) {
    return errorResponse("Query parameter 'q' is required", 400);
  }

  const limitParam = c.req.query("limit");
  const offsetParam = c.req.query("offset");
  const typesParam = c.req.query("types");

  const limit = limitParam
    ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 50))
    : 50;
  const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10) || 0) : 0;
  const types = typesParam?.split(",").filter(Boolean) as
    | ("task" | "note" | "goal" | "idea")[]
    | undefined;

  const results = cache.search.search(query, { limit, offset, types });

  return jsonResponse({
    query,
    count: results.length,
    results,
  });
});

// GET /search/stats - Cache statistics and counts
searchRouter.get("/stats", async (c) => {
  const cache = getCache(c);
  if (!cache) {
    return errorResponse(
      "Cache is not enabled. Start server with --cache flag.",
      400,
    );
  }

  const stats = cache.search.getStats();
  const lastSync = cache.sync.getLastSyncTime();

  return jsonResponse({
    ...stats,
    lastSync: lastSync?.toISOString() ?? null,
    cacheEnabled: true,
  });
});

// GET /search/status - Cache status
searchRouter.get("/status", async (c) => {
  const enabled = isCacheEnabled(c);

  if (!enabled) {
    return jsonResponse({
      enabled: false,
      message: "Cache is not enabled. Start server with --cache flag.",
    });
  }

  const cache = getCache(c);
  const lastSync = cache?.sync.getLastSyncTime();
  const needsSync = cache?.sync.needsSync() ?? true;

  return jsonResponse({
    enabled: true,
    needsSync,
    lastSync: lastSync?.toISOString() ?? null,
    dbPath: cache?.db.getPath() ?? null,
  });
});

// POST /search/rebuild - Rebuild cache from markdown
searchRouter.post("/rebuild", async (c) => {
  const pm = getProjectManager(c);

  if (!pm.isCacheEnabled()) {
    return errorResponse(
      "Cache is not enabled. Start server with --cache flag.",
      400,
    );
  }

  const result = await pm.rebuildCache();

  if (!result) {
    return errorResponse("Failed to rebuild cache.", 500);
  }

  return jsonResponse({
    success: true,
    tables: result.tables,
    items: result.items,
    duration: result.duration,
    errors: result.errors.length > 0 ? result.errors : undefined,
  });
});

// POST /search/sync - Sync cache (full sync)
searchRouter.post("/sync", async (c) => {
  const cache = getCache(c);
  if (!cache) {
    return errorResponse(
      "Cache is not enabled. Start server with --cache flag.",
      400,
    );
  }

  const result = await cache.sync.fullSync();

  return jsonResponse({
    success: true,
    tables: result.tables,
    items: result.items,
    duration: result.duration,
    errors: result.errors.length > 0 ? result.errors : undefined,
  });
});

export { searchRouter };
