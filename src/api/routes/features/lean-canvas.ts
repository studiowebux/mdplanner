/**
 * Lean Canvas CRUD routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  errorResponse,
  getParser,
  jsonResponse,
} from "../context.ts";

export const leanCanvasRouter = new Hono<{ Variables: AppVariables }>();

// GET /lean-canvas - list all lean canvases
leanCanvasRouter.get("/", async (c) => {
  const parser = getParser(c);
  const leanCanvases = await parser.readLeanCanvases();
  return jsonResponse(leanCanvases);
});

// POST /lean-canvas - create lean canvas
leanCanvasRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const leanCanvases = await parser.readLeanCanvases();
  const newCanvas = {
    id: crypto.randomUUID().substring(0, 8),
    title: body.title,
    date: body.date || new Date().toISOString().split("T")[0],
    problem: body.problem || [],
    solution: body.solution || [],
    uniqueValueProp: body.uniqueValueProp || [],
    unfairAdvantage: body.unfairAdvantage || [],
    customerSegments: body.customerSegments || [],
    existingAlternatives: body.existingAlternatives || [],
    keyMetrics: body.keyMetrics || [],
    highLevelConcept: body.highLevelConcept || [],
    channels: body.channels || [],
    earlyAdopters: body.earlyAdopters || [],
    costStructure: body.costStructure || [],
    revenueStreams: body.revenueStreams || [],
  };
  leanCanvases.push(newCanvas);
  await parser.saveLeanCanvases(leanCanvases);
  return jsonResponse(newCanvas, 201);
});

// PUT /lean-canvas/:id - update lean canvas
leanCanvasRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const leanCanvases = await parser.readLeanCanvases();
  const index = leanCanvases.findIndex((lc) => lc.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  leanCanvases[index] = { ...leanCanvases[index], ...body };
  await parser.saveLeanCanvases(leanCanvases);
  return jsonResponse({ success: true });
});

// DELETE /lean-canvas/:id - delete lean canvas
leanCanvasRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const leanCanvases = await parser.readLeanCanvases();
  const filtered = leanCanvases.filter((lc) => lc.id !== id);
  if (filtered.length === leanCanvases.length) {
    return errorResponse("Not found", 404);
  }
  await parser.saveLeanCanvases(filtered);
  return jsonResponse({ success: true });
});
