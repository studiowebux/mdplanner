/**
 * Meetings CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const meetingsRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

// --- Route definitions ---

const listMeetingsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Meetings"],
  summary: "List all meetings sorted by date desc",
  operationId: "listMeetings",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of meetings",
    },
  },
});

const getMeetingRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Meetings"],
  summary: "Get a single meeting",
  operationId: "getMeeting",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Meeting details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createMeetingRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Meetings"],
  summary: "Create meeting",
  operationId: "createMeeting",
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
      description: "Meeting created",
    },
  },
});

const updateMeetingRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Meetings"],
  summary: "Update meeting",
  operationId: "updateMeeting",
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
      description: "Meeting updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteMeetingRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Meetings"],
  summary: "Delete meeting",
  operationId: "deleteMeeting",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Meeting deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

meetingsRouter.openapi(listMeetingsRoute, async (c) => {
  const parser = getParser(c);
  const meetings = await parser.readMeetings();
  return c.json(meetings, 200);
});

meetingsRouter.openapi(getMeetingRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const meetings = await parser.readMeetings();
  const meeting = meetings.find((m) => m.id === id);
  if (!meeting) return c.json({ error: "Not found" }, 404);
  return c.json(meeting, 200);
});

meetingsRouter.openapi(createMeetingRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const meeting = await parser.addMeeting({
    title: body.title || "Untitled Meeting",
    date: body.date || new Date().toISOString().split("T")[0],
    attendees: body.attendees,
    agenda: body.agenda,
    notes: body.notes,
    actions: body.actions ?? [],
  });
  await cacheWriteThrough(c, "meetings");
  return c.json({ success: true, id: meeting.id }, 201);
});

meetingsRouter.openapi(updateMeetingRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const updated = await parser.updateMeeting(id, {
    title: body.title,
    date: body.date,
    attendees: body.attendees,
    agenda: body.agenda,
    notes: body.notes,
    actions: body.actions,
  });
  if (!updated) return c.json({ error: "Not found" }, 404);
  await cacheWriteThrough(c, "meetings");
  return c.json({ success: true }, 200);
});

meetingsRouter.openapi(deleteMeetingRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const deleted = await parser.deleteMeeting(id);
  if (!deleted) return c.json({ error: "Not found" }, 404);
  cachePurge(c, "meetings", id);
  return c.json({ success: true }, 200);
});
