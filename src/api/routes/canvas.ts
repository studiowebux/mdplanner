/**
 * Canvas/Sticky Notes routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  errorResponse,
  getParser,
  jsonResponse,
} from "./context.ts";

export const canvasRouter = new Hono<{ Variables: AppVariables }>();

// GET /canvas/sticky_notes - list all sticky notes
canvasRouter.get("/sticky_notes", async (c) => {
  const parser = getParser(c);
  const projectInfo = await parser.readProjectInfo();
  return jsonResponse(projectInfo.stickyNotes);
});

// POST /canvas/sticky_notes - create sticky note
canvasRouter.post("/sticky_notes", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const stickyNoteId = await parser.addStickyNote(body);
  await cacheWriteThrough(c, "sticky_notes");
  return jsonResponse({ id: stickyNoteId }, 201);
});

// PUT /canvas/sticky_notes/:id - update sticky note
canvasRouter.put("/sticky_notes/:id", async (c) => {
  const parser = getParser(c);
  const stickyNoteId = c.req.param("id");
  const updates = await c.req.json();
  const success = await parser.updateStickyNote(stickyNoteId, updates);

  if (success) {
    await cacheWriteThrough(c, "sticky_notes");
    return jsonResponse({ success: true });
  }
  return errorResponse("Sticky note not found", 404);
});

// DELETE /canvas/sticky_notes/:id - delete sticky note
canvasRouter.delete("/sticky_notes/:id", async (c) => {
  const parser = getParser(c);
  const stickyNoteId = c.req.param("id");
  const success = await parser.deleteStickyNote(stickyNoteId);

  if (success) {
    cachePurge(c, "sticky_notes", stickyNoteId);
    return jsonResponse({ success: true });
  }
  return errorResponse("Sticky note not found", 404);
});
