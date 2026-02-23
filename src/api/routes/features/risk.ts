/**
 * Risk Analysis CRUD routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  errorResponse,
  getParser,
  jsonResponse,
} from "../context.ts";

export const riskRouter = new Hono<{ Variables: AppVariables }>();

// GET /risk-analysis - list all risk analyses
riskRouter.get("/", async (c) => {
  const parser = getParser(c);
  const riskAnalyses = await parser.readRiskAnalyses();
  return jsonResponse(riskAnalyses);
});

// POST /risk-analysis - create risk analysis
riskRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const riskAnalyses = await parser.readRiskAnalyses();
  const newRisk = {
    id: crypto.randomUUID().substring(0, 8),
    title: body.title,
    date: body.date || new Date().toISOString().split("T")[0],
    highImpactHighProb: body.highImpactHighProb || [],
    highImpactLowProb: body.highImpactLowProb || [],
    lowImpactHighProb: body.lowImpactHighProb || [],
    lowImpactLowProb: body.lowImpactLowProb || [],
  };
  riskAnalyses.push(newRisk);
  await parser.saveRiskAnalyses(riskAnalyses);
  await cacheWriteThrough(c, "risk");
  return jsonResponse(newRisk, 201);
});

// PUT /risk-analysis/:id - update risk analysis
riskRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const riskAnalyses = await parser.readRiskAnalyses();
  const index = riskAnalyses.findIndex((r) => r.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  riskAnalyses[index] = { ...riskAnalyses[index], ...body };
  await parser.saveRiskAnalyses(riskAnalyses);
  await cacheWriteThrough(c, "risk");
  return jsonResponse({ success: true });
});

// DELETE /risk-analysis/:id - delete risk analysis
riskRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const riskAnalyses = await parser.readRiskAnalyses();
  const filtered = riskAnalyses.filter((r) => r.id !== id);
  if (filtered.length === riskAnalyses.length) {
    return errorResponse("Not found", 404);
  }
  await parser.saveRiskAnalyses(filtered);
  cachePurge(c, "risk", id);
  return jsonResponse({ success: true });
});
