/**
 * Time Tracking routes.
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

export const timeTrackingRouter = new Hono<{ Variables: AppVariables }>();

// GET /time-entries - list all time entries
timeTrackingRouter.get("/", async (c) => {
  const parser = getParser(c);
  const timeEntries = await parser.readTimeEntries();
  const result: Record<string, unknown[]> = {};
  for (const [taskId, entries] of timeEntries) {
    result[taskId] = entries;
  }
  return jsonResponse(result);
});

// GET /time-entries/:taskId - get time entries for a task
timeTrackingRouter.get("/:taskId", async (c) => {
  const parser = getParser(c);
  const taskId = c.req.param("taskId");
  const entries = await parser.getTimeEntriesForTask(taskId);
  return jsonResponse(entries);
});

// POST /time-entries/:taskId - add time entry
timeTrackingRouter.post("/:taskId", async (c) => {
  const parser = getParser(c);
  const taskId = c.req.param("taskId");
  const body = await c.req.json();
  const id = await parser.addTimeEntry(taskId, {
    date: body.date || new Date().toISOString().split("T")[0],
    hours: body.hours || 0,
    person: body.person,
    description: body.description,
  });
  await cacheWriteThrough(c, "time_entries");
  return jsonResponse({ success: true, id }, 201);
});

// DELETE /time-entries/:taskId/:entryId - delete time entry
timeTrackingRouter.delete("/:taskId/:entryId", async (c) => {
  const parser = getParser(c);
  const taskId = c.req.param("taskId");
  const entryId = c.req.param("entryId");
  const success = await parser.deleteTimeEntry(taskId, entryId);
  if (!success) return errorResponse("Not found", 404);
  cachePurge(c, "time_entries", entryId);
  return jsonResponse({ success: true });
});
