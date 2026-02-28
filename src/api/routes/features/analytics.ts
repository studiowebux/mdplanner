/**
 * Analytics route.
 * GET /api/analytics — runs all registered stat providers in parallel and
 * returns a single JSON payload. Read-only; no mutations.
 */

import { Hono } from "hono";
import {
  AppVariables,
  errorResponse,
  getParser,
  getProjectManager,
  jsonResponse,
} from "../context.ts";
import { collectAnalytics } from "../../../lib/analytics/index.ts";

export const analyticsRouter = new Hono<{ Variables: AppVariables }>();

analyticsRouter.get("/", async (c) => {
  try {
    const parser = getParser(c);
    const projectDir = getProjectManager(c).getActiveProjectDir();
    const payload = await collectAnalytics(parser, projectDir);
    return jsonResponse(payload);
  } catch (err) {
    console.error("[analytics] collection failed:", err);
    return errorResponse("Failed to collect analytics", 500);
  }
});
