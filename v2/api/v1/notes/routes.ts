// Notes CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getNoteService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateNoteSchema,
  ListNoteOptionsSchema,
  NoteSchema,
  UpdateNoteSchema,
} from "../../../types/note.types.ts";
import { ErrorSchema, IdParam } from "../../../types/api.ts";

export const notesRouter = new OpenAPIHono();

// GET /
const listNotesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Notes"],
  summary: "List all notes",
  operationId: "listNotes",
  request: {
    query: ListNoteOptionsSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(NoteSchema) } },
      description: "List of notes",
    },
  },
});

notesRouter.openapi(listNotesRoute, async (c) => {
  try {
    const { search, project } = c.req.valid("query");
    const notes = await getNoteService().list({ search, project });
    return c.json(notes, 200);
  } catch (err) {
    throw err;
  }
});

// GET /:id
const getNoteRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Notes"],
  summary: "Get note by ID",
  operationId: "getNote",
  request: {
    params: IdParam,
  },
  responses: {
    200: {
      content: { "application/json": { schema: NoteSchema } },
      description: "Note",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

notesRouter.openapi(getNoteRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const note = await getNoteService().getById(id);
    if (!note) {
      return c.json(
        { error: "NOTE_NOT_FOUND", message: `Note ${id} not found` },
        404,
      );
    }
    return c.json(note, 200);
  } catch (err) {
    throw err;
  }
});

// POST /
const createNoteRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Notes"],
  summary: "Create a note",
  operationId: "createNote",
  request: {
    body: {
      content: { "application/json": { schema: CreateNoteSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: NoteSchema } },
      description: "Created note",
    },
  },
});

notesRouter.openapi(createNoteRoute, async (c) => {
  try {
    const data = c.req.valid("json");
    const note = await getNoteService().create(data);
    publish("note.created");
    return c.json(note, 201);
  } catch (err) {
    throw err;
  }
});

// PUT /:id
const updateNoteRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Notes"],
  summary: "Update a note",
  operationId: "updateNote",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateNoteSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: NoteSchema } },
      description: "Updated note",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

notesRouter.openapi(updateNoteRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const note = await getNoteService().update(id, data);
    if (!note) {
      return c.json(
        { error: "NOTE_NOT_FOUND", message: `Note ${id} not found` },
        404,
      );
    }
    publish("note.updated");
    return c.json(note, 200);
  } catch (err) {
    throw err;
  }
});

// DELETE /:id
const deleteNoteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Notes"],
  summary: "Delete a note",
  operationId: "deleteNote",
  request: {
    params: IdParam,
  },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

notesRouter.openapi(deleteNoteRoute, async (c) => {
  try {
    const { id } = c.req.valid("param");
    const ok = await getNoteService().delete(id);
    if (!ok) {
      return c.json(
        { error: "NOTE_NOT_FOUND", message: `Note ${id} not found` },
        404,
      );
    }
    publish("note.deleted");
    return new Response(null, { status: 204 });
  } catch (err) {
    throw err;
  }
});
