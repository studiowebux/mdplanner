/**
 * Analytics route.
 * GET /api/analytics — runs all registered stat providers in parallel and
 * returns a single JSON payload. Read-only; no mutations.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { AppVariables, getParser, getProjectManager } from "../context.ts";
import { collectAnalytics } from "../../../lib/analytics/index.ts";

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

export const analyticsRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const getAnalyticsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Analytics"],
  summary: "Collect all analytics",
  operationId: "getAnalytics",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Analytics payload",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Collection failed",
    },
  },
});

analyticsRouter.openapi(getAnalyticsRoute, async (c) => {
  try {
    const parser = getParser(c);
    const projectDir = getProjectManager(c).getActiveProjectDir();
    const payload = await collectAnalytics(parser, projectDir);
    return c.json(payload, 200);
  } catch (err) {
    console.error("[analytics] collection failed:", err);
    return c.json({ error: "Failed to collect analytics" }, 500);
  }
});
