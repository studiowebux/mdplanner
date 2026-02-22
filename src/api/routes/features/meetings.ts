/**
 * Meetings CRUD routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  errorResponse,
  getParser,
  jsonResponse,
} from "../context.ts";

export const meetingsRouter = new Hono<{ Variables: AppVariables }>();

// GET /meetings - list all meetings sorted by date desc
meetingsRouter.get("/", async (c) => {
  const parser = getParser(c);
  const meetings = await parser.readMeetings();
  return jsonResponse(meetings);
});

// GET /meetings/:id - single meeting
meetingsRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const meetings = await parser.readMeetings();
  const meeting = meetings.find((m) => m.id === id);
  if (!meeting) return errorResponse("Not found", 404);
  return jsonResponse(meeting);
});

// POST /meetings - create meeting
meetingsRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const meeting = await parser.addMeeting({
    title: body.title || "Untitled Meeting",
    date: body.date || new Date().toISOString().split("T")[0],
    attendees: body.attendees,
    agenda: body.agenda,
    notes: body.notes,
    actions: body.actions ?? [],
  });
  return jsonResponse({ success: true, id: meeting.id }, 201);
});

// PUT /meetings/:id - update meeting
meetingsRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await parser.updateMeeting(id, {
    title: body.title,
    date: body.date,
    attendees: body.attendees,
    agenda: body.agenda,
    notes: body.notes,
    actions: body.actions,
  });
  if (!updated) return errorResponse("Not found", 404);
  return jsonResponse({ success: true });
});

// DELETE /meetings/:id - delete meeting
meetingsRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const deleted = await parser.deleteMeeting(id);
  if (!deleted) return errorResponse("Not found", 404);
  return jsonResponse({ success: true });
});
