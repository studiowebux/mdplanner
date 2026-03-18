// Per-request context middleware — sets nonce, enabledFeatures, pinnedKeys,
// navCategories, and CSP header.

import type { MiddlewareHandler } from "hono";
import { getProjectService } from "../singletons/services.ts";
import { readUiState } from "../utils/ui-state.ts";
import { log } from "../singletons/logger.ts";
import type { AppVariables } from "../types/app.ts";

export const contextMiddleware: MiddlewareHandler<{
  Variables: AppVariables;
}> = async (c, next) => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const nonce = btoa(String.fromCharCode(...bytes));
  c.set("nonce", nonce);

  const config = await getProjectService().getConfig();
  c.set("enabledFeatures", config.features ?? []);
  c.set("navCategories", config.navCategories);

  const sidebarState = readUiState<{ pinned?: string[] }>(c, "sidebar");
  const pinnedKeys = Array.isArray(sidebarState.pinned)
    ? sidebarState.pinned
    : [];
  log.info(`[context] pinnedKeys=${JSON.stringify(pinnedKeys)}`);
  c.set("pinnedKeys", pinnedKeys);

  await next();

  // Scalar API reference serves its own HTML page — skip CSP for that route.
  if (c.req.path === "/api/v1/reference") return;
  c.header(
    "Content-Security-Policy",
    `default-src 'self'; ` +
      `script-src 'nonce-${nonce}' 'self'; ` +
      `style-src 'nonce-${nonce}' 'self' https://fonts.googleapis.com; ` +
      `font-src https://fonts.gstatic.com`,
  );
};
