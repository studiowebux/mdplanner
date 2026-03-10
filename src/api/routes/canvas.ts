/**
 * Canvas/Sticky Notes routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "./context.ts";

export const canvasRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

// --- Route definitions ---

const listStickyNotesRoute = createRoute({
  method: "get",
  path: "/sticky_notes",
  tags: ["Canvas"],
  summary: "List all sticky notes",
  operationId: "listStickyNotes",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of sticky notes",
    },
  },
});

const createStickyNoteRoute = createRoute({
  method: "post",
  path: "/sticky_notes",
  tags: ["Canvas"],
  summary: "Create sticky note",
  operationId: "createStickyNote",
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
      content: {
        "application/json": { schema: z.object({ id: z.string() }) },
      },
      description: "Sticky note created",
    },
  },
});

const updateStickyNoteRoute = createRoute({
  method: "put",
  path: "/sticky_notes/{id}",
  tags: ["Canvas"],
  summary: "Update sticky note",
  operationId: "updateStickyNote",
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
      content: { "application/json": { schema: SuccessSchema } },
      description: "Sticky note updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteStickyNoteRoute = createRoute({
  method: "delete",
  path: "/sticky_notes/{id}",
  tags: ["Canvas"],
  summary: "Delete sticky note",
  operationId: "deleteStickyNote",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Sticky note deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

canvasRouter.openapi(listStickyNotesRoute, async (c) => {
  const parser = getParser(c);
  const projectInfo = await parser.readProjectInfo();
  return c.json(projectInfo.stickyNotes, 200);
});

canvasRouter.openapi(createStickyNoteRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const stickyNoteId = await parser.addStickyNote(body);
  await cacheWriteThrough(c, "sticky_notes");
  return c.json({ id: stickyNoteId }, 201);
});

canvasRouter.openapi(updateStickyNoteRoute, async (c) => {
  const parser = getParser(c);
  const { id: stickyNoteId } = c.req.valid("param");
  const updates = c.req.valid("json");
  const success = await parser.updateStickyNote(stickyNoteId, updates);
  if (success) {
    await cacheWriteThrough(c, "sticky_notes");
    return c.json({ success: true }, 200);
  }
  return c.json({ error: "Sticky note not found" }, 404);
});

canvasRouter.openapi(deleteStickyNoteRoute, async (c) => {
  const parser = getParser(c);
  const { id: stickyNoteId } = c.req.valid("param");
  const success = await parser.deleteStickyNote(stickyNoteId);
  if (success) {
    cachePurge(c, "sticky_notes", stickyNoteId);
    return c.json({ success: true }, 200);
  }
  return c.json({ error: "Sticky note not found" }, 404);
});
