/**
 * Fishbone (Ishikawa) Diagram CRUD routes.
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

export const fishboneRouter = new Hono<{ Variables: AppVariables }>();

// GET /fishbone - list all diagrams
fishboneRouter.get("/", async (c) => {
  const parser = getParser(c);
  const diagrams = await parser.readFishbones();
  return jsonResponse(diagrams);
});

// GET /fishbone/:id - single diagram
fishboneRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const diagrams = await parser.readFishbones();
  const diagram = diagrams.find((d) => d.id === id);
  if (!diagram) return errorResponse("Not found", 404);
  return jsonResponse(diagram);
});

// POST /fishbone - create diagram
fishboneRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const diagram = await parser.addFishbone({
    title: body.title || "Untitled Diagram",
    description: body.description,
    causes: body.causes ?? [],
  });
  await cacheWriteThrough(c, "fishbone");
  return jsonResponse({ success: true, id: diagram.id }, 201);
});

// PUT /fishbone/:id - update diagram
fishboneRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await parser.updateFishbone(id, {
    title: body.title,
    description: body.description,
    causes: body.causes,
  });
  if (!updated) return errorResponse("Not found", 404);
  await cacheWriteThrough(c, "fishbone");
  return jsonResponse({ success: true });
});

// DELETE /fishbone/:id - delete diagram
fishboneRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const deleted = await parser.deleteFishbone(id);
  if (!deleted) return errorResponse("Not found", 404);
  cachePurge(c, "fishbone", id);
  return jsonResponse({ success: true });
});
