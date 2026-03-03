/**
 * SWOT Analysis CRUD routes.
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

export const swotRouter = new Hono<{ Variables: AppVariables }>();

// GET /swot - list all SWOT analyses
swotRouter.get("/", async (c) => {
  const parser = getParser(c);
  const swotAnalyses = await parser.readSwotAnalyses();
  return jsonResponse(swotAnalyses);
});

// POST /swot - create SWOT analysis
swotRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const swotAnalyses = await parser.readSwotAnalyses();
  const id = crypto.randomUUID().substring(0, 8);
  swotAnalyses.push({
    id,
    title: body.title,
    date: body.date || new Date().toISOString().split("T")[0],
    strengths: body.strengths || [],
    weaknesses: body.weaknesses || [],
    opportunities: body.opportunities || [],
    threats: body.threats || [],
  });
  await parser.saveSwotAnalyses(swotAnalyses);
  await cacheWriteThrough(c, "swot");
  return jsonResponse({ success: true, id }, 201);
});

// PUT /swot/:id - update SWOT analysis
swotRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const swotAnalyses = await parser.readSwotAnalyses();
  const index = swotAnalyses.findIndex((s) => s.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  swotAnalyses[index] = { ...swotAnalyses[index], ...body };
  await parser.saveSwotAnalyses(swotAnalyses);
  await cacheWriteThrough(c, "swot");
  return jsonResponse({ success: true });
});

// DELETE /swot/:id - delete SWOT analysis
swotRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const swotAnalyses = await parser.readSwotAnalyses();
  const filtered = swotAnalyses.filter((s) => s.id !== id);
  if (filtered.length === swotAnalyses.length) {
    return errorResponse("Not found", 404);
  }
  await parser.saveSwotAnalyses(filtered);
  cachePurge(c, "swot", id);
  return jsonResponse({ success: true });
});
