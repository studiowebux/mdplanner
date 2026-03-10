/**
 * Notes CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "./context.ts";
import { CreateNoteSchema, UpdateNoteSchema } from "../schemas.ts";

export const notesRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const SuccessSchema = z.object({ success: z.boolean() });

const NoteSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    mode: z.enum(["simple", "enhanced"]).optional(),
    project: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    revision: z.number().optional(),
  })
  .openapi("Note");

// --- Route definitions ---

const listNotesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Notes"],
  summary: "List all notes",
  operationId: "listNotes",
  request: {
    query: z.object({
      project: z.string().optional().openapi({
        description: "Filter by project name",
        example: "MD Planner",
      }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(NoteSchema) } },
      description: "List of notes",
    },
  },
});

const getNoteRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Notes"],
  summary: "Get single note by ID",
  operationId: "getNote",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: NoteSchema } },
      description: "Note details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Note not found",
    },
  },
});

const createNoteRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Notes"],
  summary: "Create note",
  operationId: "createNote",
  request: {
    body: {
      content: { "application/json": { schema: CreateNoteSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        "application/json": { schema: z.object({ id: z.string() }) },
      },
      description: "Note created",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
  },
});

const updateNoteRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Notes"],
  summary: "Update note",
  operationId: "updateNote",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: UpdateNoteSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Note updated",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Validation error",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Note not found",
    },
    409: {
      content: {
        "application/json": {
          schema: z.object({
            error: z.string(),
            serverUpdatedAt: z.string(),
          }),
        },
      },
      description: "Optimistic locking conflict",
    },
  },
});

const deleteNoteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Notes"],
  summary: "Delete note",
  operationId: "deleteNote",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Note deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Note not found",
    },
  },
});

// --- Handlers ---

notesRouter.openapi(listNotesRoute, async (c) => {
  const parser = getParser(c);
  const projectInfo = await parser.readProjectInfo();
  const { project: projectFilter } = c.req.valid("query");
  const notes = projectFilter
    ? projectInfo.notes.filter((n) =>
      (n.project || "").toLowerCase() === projectFilter.toLowerCase()
    )
    : projectInfo.notes;
  return c.json(notes, 200);
});

notesRouter.openapi(getNoteRoute, async (c) => {
  const parser = getParser(c);
  const { id: noteId } = c.req.valid("param");
  const projectInfo = await parser.readProjectInfo();
  const note = projectInfo.notes.find((n) => n.id === noteId);

  if (note) return c.json(note, 200);
  return c.json({ error: "Note not found" }, 404);
});

notesRouter.openapi(createNoteRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const noteId = await parser.addNote(
    body as Parameters<typeof parser.addNote>[0],
  );
  await cacheWriteThrough(c, "notes");
  return c.json({ id: noteId }, 201);
});

notesRouter.openapi(updateNoteRoute, async (c) => {
  const parser = getParser(c);
  const { id: noteId } = c.req.valid("param");
  const updates = c.req.valid("json");

  const existing = await parser.readNote(noteId);
  if (existing?.updatedAt && updates.updatedAt) {
    const stored = new Date(existing.updatedAt).getTime();
    const requested = new Date(updates.updatedAt).getTime();
    if (stored > requested) {
      return c.json(
        { error: "Conflict", serverUpdatedAt: existing.updatedAt },
        409,
      );
    }
  }

  const success = await parser.updateNote(noteId, updates);

  if (success) {
    await cacheWriteThrough(c, "notes");
    return c.json({ success: true }, 200);
  }
  return c.json({ error: "Note not found" }, 404);
});

notesRouter.openapi(deleteNoteRoute, async (c) => {
  const parser = getParser(c);
  const { id: noteId } = c.req.valid("param");
  const success = await parser.deleteNote(noteId);

  if (success) {
    cachePurge(c, "notes", noteId);
    return c.json({ success: true }, 200);
  }
  return c.json({ error: "Note not found" }, 404);
});
