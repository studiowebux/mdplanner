// Analytics API — GET /api/v1/analytics with customer-centric filters.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getProjectAnalytics } from "../../../services/analytics.service.ts";
import { AnalyticsFiltersSchema } from "../../../types/analytics.types.ts";
import { errorContent, jsonContent } from "../../../types/api.ts";

export const analyticsRouter = new OpenAPIHono();

const getAnalyticsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Analytics"],
  summary: "Aggregate cross-domain analytics with optional filters",
  operationId: "getAnalytics",
  request: {
    query: AnalyticsFiltersSchema,
  },
  responses: {
    200: jsonContent(z.any(), "Analytics payload"),
    500: errorContent("Aggregation failed"),
  },
});

analyticsRouter.openapi(getAnalyticsRoute, async (c) => {
  try {
    const filters = c.req.valid("query");
    const data = await getProjectAnalytics(filters);
    return c.json(data, 200);
  } catch (err) {
    console.error("[analytics] aggregation failed:", err);
    return c.json({
      error: "Failed to collect analytics",
      message: String(err),
    }, 500);
  }
});
