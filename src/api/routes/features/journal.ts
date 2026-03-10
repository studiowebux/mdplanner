/**
 * Journal CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  checkConflict,
  getParser,
} from "../context.ts";

export const journalRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

const listJournalRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Journal"],
  summary: "List all journal entries",
  operationId: "listJournalEntries",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of journal entries",
    },
  },
});

const getJournalRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Journal"],
  summary: "Get a single journal entry",
  operationId: "getJournalEntry",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Journal entry",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createJournalRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Journal"],
  summary: "Create journal entry",
  operationId: "createJournalEntry",
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
        "application/json": {
          schema: z.object({ success: z.boolean(), id: z.string() }),
        },
      },
      description: "Journal entry created",
    },
  },
});

const updateJournalRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Journal"],
  summary: "Update journal entry",
  operationId: "updateJournalEntry",
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
      description: "Journal entry updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
    409: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Conflict — stale edit",
    },
  },
});

const deleteJournalRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Journal"],
  summary: "Delete journal entry",
  operationId: "deleteJournalEntry",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Journal entry deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

journalRouter.openapi(listJournalRoute, async (c) => {
  const parser = getParser(c);
  const entries = await parser.readJournalEntries();
  return c.json(entries, 200);
});

journalRouter.openapi(getJournalRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const entries = await parser.readJournalEntries();
  const entry = entries.find((e) => e.id === id);
  if (!entry) return c.json({ error: "Not found" }, 404);
  return c.json(entry, 200);
});

journalRouter.openapi(createJournalRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const entry = await parser.addJournalEntry({
    date: body.date || new Date().toISOString().split("T")[0],
    time: body.time,
    title: body.title,
    mood: body.mood,
    tags: body.tags,
    body: body.body || "",
  });
  await cacheWriteThrough(c, "journal");
  return c.json({ success: true, id: entry.id }, 201);
});

journalRouter.openapi(updateJournalRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const existing = await parser.readJournalEntry(id);
  const conflict = checkConflict(existing?.updated, body.updatedAt);
  // deno-lint-ignore no-explicit-any
  if (conflict) return conflict as any;

  const updated = await parser.updateJournalEntry(id, {
    date: body.date,
    time: body.time,
    title: body.title,
    mood: body.mood,
    tags: body.tags,
    body: body.body,
  });
  if (!updated) return c.json({ error: "Not found" }, 404);
  await cacheWriteThrough(c, "journal");
  return c.json({ success: true }, 200);
});

journalRouter.openapi(deleteJournalRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const deleted = await parser.deleteJournalEntry(id);
  if (!deleted) return c.json({ error: "Not found" }, 404);
  cachePurge(c, "journal", id);
  return c.json({ success: true }, 200);
});
