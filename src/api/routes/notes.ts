/**
 * Notes CRUD routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  checkConflict,
  errorResponse,
  getParser,
  jsonResponse,
} from "./context.ts";

export const notesRouter = new Hono<{ Variables: AppVariables }>();

// GET /notes - list all notes (optional ?project= filter)
notesRouter.get("/", async (c) => {
  const parser = getParser(c);
  const projectInfo = await parser.readProjectInfo();
  const projectFilter = c.req.query("project");
  const notes = projectFilter
    ? projectInfo.notes.filter((n) =>
      (n.project || "").toLowerCase() === projectFilter.toLowerCase()
    )
    : projectInfo.notes;
  return jsonResponse(notes);
});

// GET /notes/:id - get single note
notesRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const noteId = c.req.param("id");
  const projectInfo = await parser.readProjectInfo();
  const note = projectInfo.notes.find((n) => n.id === noteId);

  if (note) {
    return jsonResponse(note);
  }
  return errorResponse("Note not found", 404);
});

// POST /notes - create note
notesRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const noteId = await parser.addNote(body);
  await cacheWriteThrough(c, "notes");
  return jsonResponse({ id: noteId }, 201);
});

// PUT /notes/:id - update note
notesRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const noteId = c.req.param("id");
  const updates = await c.req.json();

  const existing = await parser.readNote(noteId);
  const conflict = checkConflict(existing?.updatedAt, updates.updatedAt);
  if (conflict) return conflict;

  const success = await parser.updateNote(noteId, updates);

  if (success) {
    await cacheWriteThrough(c, "notes");
    return jsonResponse({ success: true });
  }
  return errorResponse("Note not found", 404);
});

// DELETE /notes/:id - delete note
notesRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const noteId = c.req.param("id");
  const success = await parser.deleteNote(noteId);

  if (success) {
    cachePurge(c, "notes", noteId);
    return jsonResponse({ success: true });
  }
  return errorResponse("Note not found", 404);
});
