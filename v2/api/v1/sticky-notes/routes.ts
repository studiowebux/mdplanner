// Sticky Note CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getStickyNoteService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateStickyNoteSchema,
  ListStickyNoteOptionsSchema,
  StickyNoteSchema,
  UpdatePositionSchema,
  UpdateSizeSchema,
  UpdateStickyNoteSchema,
} from "../../../types/sticky-note.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";

export const stickyNotesRouter = new OpenAPIHono();

// GET /
const listStickyNotesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Sticky Notes"],
  summary: "List all sticky notes",
  operationId: "listStickyNotes",
  request: { query: ListStickyNoteOptionsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(StickyNoteSchema) } },
      description: "List of sticky notes",
    },
  },
});

stickyNotesRouter.openapi(listStickyNotesRoute, async (c) => {
  const { color, q, project } = c.req.valid("query");
  const notes = await getStickyNoteService().list({ color, q, project });
  return c.json(notes, 200);
});

// GET /{id}
const getStickyNoteRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Sticky Notes"],
  summary: "Get sticky note by ID",
  operationId: "getStickyNote",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: StickyNoteSchema } },
      description: "Sticky note",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

stickyNotesRouter.openapi(getStickyNoteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const note = await getStickyNoteService().getById(id);
  if (!note) return c.json(notFound("STICKY_NOTE", id), 404);
  return c.json(note, 200);
});

// POST /
const createStickyNoteRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Sticky Notes"],
  summary: "Create a sticky note",
  operationId: "createStickyNote",
  request: {
    body: {
      content: { "application/json": { schema: CreateStickyNoteSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: StickyNoteSchema } },
      description: "Created sticky note",
    },
  },
});

stickyNotesRouter.openapi(createStickyNoteRoute, async (c) => {
  const data = c.req.valid("json");
  const note = await getStickyNoteService().create(data);
  publish("sticky_note.created");
  return c.json(note, 201);
});

// PUT /{id}
const updateStickyNoteRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Sticky Notes"],
  summary: "Update a sticky note",
  operationId: "updateStickyNote",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateStickyNoteSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: StickyNoteSchema } },
      description: "Updated sticky note",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

stickyNotesRouter.openapi(updateStickyNoteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const note = await getStickyNoteService().update(id, data);
  if (!note) return c.json(notFound("STICKY_NOTE", id), 404);
  publish("sticky_note.updated");
  return c.json(note, 200);
});

// PATCH /{id}/position
const updatePositionRoute = createRoute({
  method: "patch",
  path: "/{id}/position",
  tags: ["Sticky Notes"],
  summary: "Update sticky note canvas position",
  operationId: "updateStickyNotePosition",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdatePositionSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: StickyNoteSchema } },
      description: "Updated sticky note",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

stickyNotesRouter.openapi(updatePositionRoute, async (c) => {
  const { id } = c.req.valid("param");
  const position = c.req.valid("json");
  const note = await getStickyNoteService().updatePosition(id, position);
  if (!note) return c.json(notFound("STICKY_NOTE", id), 404);
  publish("sticky_note.updated");
  return c.json(note, 200);
});

// PATCH /{id}/size
const updateSizeRoute = createRoute({
  method: "patch",
  path: "/{id}/size",
  tags: ["Sticky Notes"],
  summary: "Update sticky note canvas size",
  operationId: "updateStickyNoteSize",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateSizeSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: StickyNoteSchema } },
      description: "Updated sticky note",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

stickyNotesRouter.openapi(updateSizeRoute, async (c) => {
  const { id } = c.req.valid("param");
  const size = c.req.valid("json");
  const note = await getStickyNoteService().updateSize(id, size);
  if (!note) return c.json(notFound("STICKY_NOTE", id), 404);
  publish("sticky_note.updated");
  return c.json(note, 200);
});

// DELETE /{id}
const deleteStickyNoteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Sticky Notes"],
  summary: "Delete a sticky note",
  operationId: "deleteStickyNote",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

stickyNotesRouter.openapi(deleteStickyNoteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getStickyNoteService().delete(id);
  if (!ok) return c.json(notFound("STICKY_NOTE", id), 404);
  publish("sticky_note.deleted");
  return new Response(null, { status: 204 });
});
