// Journal API routes — OpenAPI CRUD endpoints.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getJournalService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateJournalEntrySchema,
  JournalEntrySchema,
  ListJournalOptionsSchema,
  UpdateJournalEntrySchema,
} from "../../../types/journal.types.ts";
import {
  IdParam,
  jsonContent,
  notFound,
  notFoundContent,
} from "../../../types/api.ts";

export const journalApiRouter = new OpenAPIHono();

const listJournalRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Journal"],
  summary: "List all journal entries",
  operationId: "listJournalEntries",
  request: { query: ListJournalOptionsSchema },
  responses: {
    200: jsonContent(z.array(JournalEntrySchema), "List of journal entries"),
  },
});

journalApiRouter.openapi(listJournalRoute, async (c) => {
  const { mood, tag, from, to, q } = c.req.valid("query");
  const items = await getJournalService().list({ mood, tag, from, to, q });
  return c.json(items, 200);
});

const getJournalRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Journal"],
  summary: "Get journal entry by ID",
  operationId: "getJournalEntry",
  request: { params: IdParam },
  responses: {
    200: jsonContent(JournalEntrySchema, "Journal entry"),
    404: notFoundContent,
  },
});

journalApiRouter.openapi(getJournalRoute, async (c) => {
  const { id } = c.req.valid("param");
  const entry = await getJournalService().getById(id);
  if (!entry) return c.json(notFound("JournalEntry", id), 404);
  return c.json(entry, 200);
});

const createJournalRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Journal"],
  summary: "Create a journal entry",
  operationId: "createJournalEntry",
  request: {
    body: {
      content: { "application/json": { schema: CreateJournalEntrySchema } },
      required: true,
    },
  },
  responses: {
    201: jsonContent(JournalEntrySchema, "Created journal entry"),
  },
});

journalApiRouter.openapi(createJournalRoute, async (c) => {
  const data = c.req.valid("json");
  const entry = await getJournalService().create(data);
  publish("journal.created");
  return c.json(entry, 201);
});

const updateJournalRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Journal"],
  summary: "Update a journal entry",
  operationId: "updateJournalEntry",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateJournalEntrySchema } },
      required: true,
    },
  },
  responses: {
    200: jsonContent(JournalEntrySchema, "Updated journal entry"),
    404: notFoundContent,
  },
});

journalApiRouter.openapi(updateJournalRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const entry = await getJournalService().update(id, data);
  if (!entry) return c.json(notFound("JournalEntry", id), 404);
  publish("journal.updated");
  return c.json(entry, 200);
});

const deleteJournalRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Journal"],
  summary: "Delete a journal entry",
  operationId: "deleteJournalEntry",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: notFoundContent,
  },
});

journalApiRouter.openapi(deleteJournalRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getJournalService().delete(id);
  if (!ok) return c.json(notFound("JournalEntry", id), 404);
  publish("journal.deleted");
  return new Response(null, { status: 204 });
});
