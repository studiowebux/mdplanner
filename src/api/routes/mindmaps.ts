/**
 * Mindmap CRUD routes.
 */

import { Hono } from "hono";
import { AppVariables, getParser, jsonResponse, errorResponse } from "./context.ts";

export const mindmapsRouter = new Hono<{ Variables: AppVariables }>();

// GET /mindmaps - list all mindmaps
mindmapsRouter.get("/", async (c) => {
  const parser = getParser(c);
  const projectInfo = await parser.readProjectInfo();
  return jsonResponse(projectInfo.mindmaps);
});

// GET /mindmaps/:id - get single mindmap
mindmapsRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const mindmapId = c.req.param("id");
  const projectInfo = await parser.readProjectInfo();
  const mindmap = projectInfo.mindmaps.find((m) => m.id === mindmapId);

  if (mindmap) {
    return jsonResponse(mindmap);
  }
  return errorResponse("Mindmap not found", 404);
});

// POST /mindmaps - create mindmap
mindmapsRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const mindmapId = await parser.addMindmap(body);
  return jsonResponse({ id: mindmapId }, 201);
});

// PUT /mindmaps/:id - update mindmap
mindmapsRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const mindmapId = c.req.param("id");
  const updates = await c.req.json();
  const success = await parser.updateMindmap(mindmapId, updates);

  if (success) {
    return jsonResponse({ success: true });
  }
  return errorResponse("Mindmap not found", 404);
});

// DELETE /mindmaps/:id - delete mindmap
mindmapsRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const mindmapId = c.req.param("id");
  const success = await parser.deleteMindmap(mindmapId);

  if (success) {
    return jsonResponse({ success: true });
  }
  return errorResponse("Mindmap not found", 404);
});
