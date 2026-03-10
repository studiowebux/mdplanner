/**
 * KPI Snapshot CRUD routes.
 * Pattern: Feature Router with CRUD operations.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const kpisRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

const listKpisRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["KPIs"],
  summary: "List all KPI snapshots",
  operationId: "listKpis",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of KPI snapshots",
    },
  },
});

const createKpiRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["KPIs"],
  summary: "Create KPI snapshot",
  operationId: "createKpi",
  request: {
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: z.any() } },
      description: "KPI snapshot created",
    },
  },
});

const updateKpiRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["KPIs"],
  summary: "Update KPI snapshot",
  operationId: "updateKpi",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "KPI snapshot updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteKpiRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["KPIs"],
  summary: "Delete KPI snapshot",
  operationId: "deleteKpi",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "KPI snapshot deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

kpisRouter.openapi(listKpisRoute, async (c) => {
  const parser = getParser(c);
  const snapshots = await parser.readKpiSnapshots();
  return c.json(snapshots, 200);
});

kpisRouter.openapi(createKpiRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const mrr = Number(body.mrr) || 0;
  const snapshot = await parser.addKpiSnapshot({
    period: body.period || "",
    mrr,
    arr: mrr * 12,
    churn_rate: Number(body.churn_rate) || 0,
    ltv: Number(body.ltv) || 0,
    cac: Number(body.cac) || 0,
    growth_rate: Number(body.growth_rate) || 0,
    active_users: Number(body.active_users) || 0,
    nrr: Number(body.nrr) || 0,
    gross_margin: Number(body.gross_margin) || 0,
    notes: body.notes || "",
  });
  await cacheWriteThrough(c, "kpi_snapshots");
  return c.json(snapshot, 201);
});

kpisRouter.openapi(updateKpiRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const updated = await parser.updateKpiSnapshot(id, body);
  if (!updated) return c.json({ error: "Not found" }, 404);
  await cacheWriteThrough(c, "kpi_snapshots");
  return c.json(updated, 200);
});

kpisRouter.openapi(deleteKpiRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const success = await parser.deleteKpiSnapshot(id);
  if (!success) return c.json({ error: "Not found" }, 404);
  cachePurge(c, "kpi_snapshots", id);
  return c.json({ success: true }, 200);
});
