// Identity guard — redirects anonymous SSR requests to /identity.
// Exempt: /identity, /settings/identity, /api/*, /mcp/*, /sse, /css/*, /js/*, /favicon*

import type { MiddlewareHandler } from "hono";
import type { AppVariables } from "../types/app.ts";

const EXEMPT_PREFIXES = [
  "/identity",
  "/settings/identity",
  "/api/",
  "/mcp/",
  "/sse",
  "/css/",
  "/js/",
  "/favicon",
  "/webdav",
];

export const identityGuard: MiddlewareHandler<{
  Variables: AppVariables;
}> = async (c, next) => {
  const actor = c.get("actor");
  if (actor?.source === "anonymous") {
    const path = c.req.path;
    const exempt = EXEMPT_PREFIXES.some((p) =>
      path === p || path.startsWith(p)
    );
    if (!exempt) return c.redirect("/identity", 302);
  }
  await next();
};
