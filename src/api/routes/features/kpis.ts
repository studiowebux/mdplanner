/**
 * KPI Snapshot CRUD routes.
 * Pattern: Feature Router with CRUD operations.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cacheWriteThrough,
  cachePurge,
  errorResponse,
  getParser,
  jsonResponse,
} from "../context.ts";

export const kpisRouter = new Hono<{ Variables: AppVariables }>();

// GET /kpis - list all KPI snapshots
kpisRouter.get("/", async (c) => {
  const parser = getParser(c);
  const snapshots = await parser.readKpiSnapshots();
  return jsonResponse(snapshots);
});

// POST /kpis - create snapshot
kpisRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
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
  return jsonResponse(snapshot, 201);
});

// PUT /kpis/:id - update snapshot
kpisRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await parser.updateKpiSnapshot(id, body);
  if (!updated) return errorResponse("Not found", 404);
  await cacheWriteThrough(c, "kpi_snapshots");
  return jsonResponse(updated);
});

// DELETE /kpis/:id - delete snapshot
kpisRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const success = await parser.deleteKpiSnapshot(id);
  if (!success) return errorResponse("Not found", 404);
  cachePurge(c, "kpi_snapshots", id);
  return jsonResponse({ success: true });
});
