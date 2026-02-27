/**
 * Journal CRUD routes.
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

export const journalRouter = new Hono<{ Variables: AppVariables }>();

// GET /journal - list all entries sorted by date desc
journalRouter.get("/", async (c) => {
  const parser = getParser(c);
  const entries = await parser.readJournalEntries();
  return jsonResponse(entries);
});

// GET /journal/:id - single entry
journalRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const entries = await parser.readJournalEntries();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return errorResponse("Not found", 404);
  return jsonResponse(entry);
});

// POST /journal - create entry
journalRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const entry = await parser.addJournalEntry({
    date: body.date || new Date().toISOString().split("T")[0],
    title: body.title,
    mood: body.mood,
    tags: body.tags,
    body: body.body || "",
  });
  await cacheWriteThrough(c, "journal");
  return jsonResponse({ success: true, id: entry.id }, 201);
});

// PUT /journal/:id - update entry
journalRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await parser.updateJournalEntry(id, {
    date: body.date,
    title: body.title,
    mood: body.mood,
    tags: body.tags,
    body: body.body,
  });
  if (!updated) return errorResponse("Not found", 404);
  await cacheWriteThrough(c, "journal");
  return jsonResponse({ success: true });
});

// DELETE /journal/:id - delete entry
journalRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const deleted = await parser.deleteJournalEntry(id);
  if (!deleted) return errorResponse("Not found", 404);
  cachePurge(c, "journal", id);
  return jsonResponse({ success: true });
});
