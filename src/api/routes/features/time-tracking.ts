/**
 * Time Tracking routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const timeTrackingRouter = new OpenAPIHono<
  { Variables: AppVariables }
>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const taskIdParam = z.object({
  taskId: z.string().openapi({ param: { name: "taskId", in: "path" } }),
});
const taskIdEntryIdParams = z.object({
  taskId: z.string().openapi({ param: { name: "taskId", in: "path" } }),
  entryId: z.string().openapi({ param: { name: "entryId", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

// --- Route definitions ---

const listTimeEntriesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["TimeTracking"],
  summary: "List all time entries",
  operationId: "listTimeEntries",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Map of task IDs to time entry arrays",
    },
  },
});

const getTimeEntriesForTaskRoute = createRoute({
  method: "get",
  path: "/{taskId}",
  tags: ["TimeTracking"],
  summary: "Get time entries for a task",
  operationId: "getTimeEntriesForTask",
  request: { params: taskIdParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "Time entries for the task",
    },
  },
});

const createTimeEntryRoute = createRoute({
  method: "post",
  path: "/{taskId}",
  tags: ["TimeTracking"],
  summary: "Add time entry for a task",
  operationId: "createTimeEntry",
  request: {
    params: taskIdParam,
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
      description: "Time entry created",
    },
  },
});

const deleteTimeEntryRoute = createRoute({
  method: "delete",
  path: "/{taskId}/{entryId}",
  tags: ["TimeTracking"],
  summary: "Delete time entry",
  operationId: "deleteTimeEntry",
  request: { params: taskIdEntryIdParams },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Time entry deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

timeTrackingRouter.openapi(listTimeEntriesRoute, async (c) => {
  const parser = getParser(c);
  const timeEntries = await parser.readTimeEntries();
  const result: Record<string, unknown[]> = {};
  for (const [taskId, entries] of timeEntries) {
    result[taskId] = entries;
  }
  return c.json(result, 200);
});

timeTrackingRouter.openapi(getTimeEntriesForTaskRoute, async (c) => {
  const parser = getParser(c);
  const { taskId } = c.req.valid("param");
  const entries = await parser.getTimeEntriesForTask(taskId);
  return c.json(entries, 200);
});

timeTrackingRouter.openapi(createTimeEntryRoute, async (c) => {
  const parser = getParser(c);
  const { taskId } = c.req.valid("param");
  const body = c.req.valid("json");
  const id = await parser.addTimeEntry(taskId, {
    date: body.date || new Date().toISOString().split("T")[0],
    hours: body.hours || 0,
    person: body.person,
    description: body.description,
  });
  await cacheWriteThrough(c, "time_entries");
  return c.json({ success: true, id }, 201);
});

timeTrackingRouter.openapi(deleteTimeEntryRoute, async (c) => {
  const parser = getParser(c);
  const { taskId, entryId } = c.req.valid("param");
  const success = await parser.deleteTimeEntry(taskId, entryId);
  if (!success) return c.json({ error: "Not found" }, 404);
  cachePurge(c, "time_entries", entryId);
  return c.json({ success: true }, 200);
});
