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

const ErrorSchema = z
  .object({ error: z.string(), message: z.string().optional() })
  .openapi("JournalError");
const SuccessSchema = z
  .object({ success: z.boolean() })
  .openapi("JournalSuccess");
const SuccessWithIdSchema = z
  .object({ success: z.boolean(), id: z.string() })
  .openapi("JournalSuccessWithId");
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const journalMood = z.enum(["great", "good", "neutral", "bad", "terrible"]);

const JournalEntrySchema = z
  .object({
    id: z.string(),
    date: z.string(),
    time: z.string().optional(),
    title: z.string().optional(),
    mood: journalMood.optional(),
    tags: z.array(z.string()).optional(),
    body: z.string(),
    created: z.string(),
    updated: z.string(),
  })
  .openapi("JournalEntry");

const CreateJournalEntrySchema = z
  .object({
    date: z.string().optional().openapi({ description: "Date (YYYY-MM-DD)" }),
    time: z.string().optional().openapi({ description: "Time (HH:MM)" }),
    title: z.string().optional(),
    mood: journalMood.optional(),
    tags: z.array(z.string()).nullish(),
    body: z.string().optional(),
  })
  .openapi("CreateJournalEntry");

const UpdateJournalEntrySchema = z
  .object({
    date: z.string().optional(),
    time: z.string().optional(),
    title: z.string().optional(),
    mood: journalMood.optional(),
    tags: z.array(z.string()).nullish(),
    body: z.string().optional(),
    updatedAt: z.string().optional().openapi({
      description: "Last known updatedAt for conflict detection",
    }),
  })
  .openapi("UpdateJournalEntry");

const listJournalRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Journal"],
  summary: "List all journal entries",
  operationId: "listJournalEntries",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(JournalEntrySchema) },
      },
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
      content: { "application/json": { schema: JournalEntrySchema } },
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
      content: { "application/json": { schema: CreateJournalEntrySchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessWithIdSchema } },
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
      content: { "application/json": { schema: UpdateJournalEntrySchema } },
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
    tags: body.tags ?? undefined,
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
    tags: body.tags ?? undefined,
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
