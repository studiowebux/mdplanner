/**
 * MoSCoW Analysis CRUD routes.
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

export const moscowRouter = new Hono<{ Variables: AppVariables }>();

// GET /moscow - list all analyses
moscowRouter.get("/", async (c) => {
  const parser = getParser(c);
  const analyses = await parser.readMoscowAnalyses();
  return jsonResponse(analyses);
});

// POST /moscow - create analysis
moscowRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const analysis = await parser.addMoscowAnalysis({
    title: body.title || "Untitled Analysis",
    date: body.date || new Date().toISOString().split("T")[0],
    must: body.must || [],
    should: body.should || [],
    could: body.could || [],
    wont: body.wont || [],
  });
  await cacheWriteThrough(c, "moscow");
  return jsonResponse(analysis, 201);
});

// PUT /moscow/:id - update analysis
moscowRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await parser.updateMoscowAnalysis(id, body);
  if (!updated) return errorResponse("Not found", 404);
  await cacheWriteThrough(c, "moscow");
  return jsonResponse(updated);
});

// DELETE /moscow/:id - delete analysis
moscowRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const success = await parser.deleteMoscowAnalysis(id);
  if (!success) return errorResponse("Not found", 404);
  cachePurge(c, "moscow", id);
  return jsonResponse({ success: true });
});
