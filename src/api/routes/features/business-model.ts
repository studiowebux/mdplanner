/**
 * Business Model Canvas CRUD routes.
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

export const businessModelRouter = new Hono<{ Variables: AppVariables }>();

// GET /business-model - list all business model canvases
businessModelRouter.get("/", async (c) => {
  const parser = getParser(c);
  const canvases = await parser.readBusinessModelCanvases();
  return jsonResponse(canvases);
});

// POST /business-model - create business model canvas
businessModelRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const canvases = await parser.readBusinessModelCanvases();
  const newCanvas = {
    id: crypto.randomUUID().substring(0, 8),
    title: body.title,
    date: body.date || new Date().toISOString().split("T")[0],
    keyPartners: body.keyPartners || [],
    keyActivities: body.keyActivities || [],
    keyResources: body.keyResources || [],
    valueProposition: body.valueProposition || [],
    customerRelationships: body.customerRelationships || [],
    channels: body.channels || [],
    customerSegments: body.customerSegments || [],
    costStructure: body.costStructure || [],
    revenueStreams: body.revenueStreams || [],
  };
  canvases.push(newCanvas);
  await parser.saveBusinessModelCanvases(canvases);
  await cacheWriteThrough(c, "business_model");
  return jsonResponse(newCanvas, 201);
});

// PUT /business-model/:id - update business model canvas
businessModelRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const canvases = await parser.readBusinessModelCanvases();
  const index = canvases.findIndex((c) => c.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  canvases[index] = { ...canvases[index], ...body };
  await parser.saveBusinessModelCanvases(canvases);
  await cacheWriteThrough(c, "business_model");
  return jsonResponse({ success: true });
});

// DELETE /business-model/:id - delete business model canvas
businessModelRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const canvases = await parser.readBusinessModelCanvases();
  const filtered = canvases.filter((c) => c.id !== id);
  if (filtered.length === canvases.length) {
    return errorResponse("Not found", 404);
  }
  await parser.saveBusinessModelCanvases(filtered);
  cachePurge(c, "business_model", id);
  return jsonResponse({ success: true });
});
