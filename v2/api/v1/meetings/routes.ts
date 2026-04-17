// Meeting CRUD routes — OpenAPIHono router consumed by api/mod.ts.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getMeetingService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import type { Meeting } from "../../../types/meeting.types.ts";
import {
  ActionIdParam,
  AddMeetingActionSchema,
  CreateMeetingSchema,
  LinkedIdParam,
  LinkMeetingSchema,
  ListMeetingOptionsSchema,
  MeetingSchema,
  UpdateMeetingSchema,
} from "../../../types/meeting.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";
import {
  renderActionsTable,
  renderCarryoverSection,
  renderRelatedSection,
} from "../../../views/meeting-detail.tsx";

export const meetingsRouter = new OpenAPIHono();

// GET /
const listRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Meetings"],
  summary: "List all meetings",
  operationId: "listMeetings",
  request: { query: ListMeetingOptionsSchema },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(MeetingSchema) },
      },
      description: "List of meetings",
    },
  },
});

meetingsRouter.openapi(listRoute, async (c) => {
  const { q, date_from, date_to, open_actions_only, project } = c.req.valid(
    "query",
  );
  const items = await getMeetingService().list({
    q,
    date_from,
    date_to,
    open_actions_only,
    project,
  });
  return c.json(items, 200);
});

// GET /{id}
const getRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Meetings"],
  summary: "Get meeting by ID",
  operationId: "getMeeting",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: MeetingSchema } },
      description: "Meeting",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

meetingsRouter.openapi(getRoute, async (c) => {
  const { id } = c.req.valid("param");
  const item = await getMeetingService().getById(id);
  if (!item) return c.json(notFound("MEETING", id), 404);
  return c.json(item, 200);
});

// POST /
const createRoute_ = createRoute({
  method: "post",
  path: "/",
  tags: ["Meetings"],
  summary: "Create a meeting",
  operationId: "createMeeting",
  request: {
    body: {
      content: { "application/json": { schema: CreateMeetingSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: MeetingSchema } },
      description: "Created meeting",
    },
  },
});

meetingsRouter.openapi(createRoute_, async (c) => {
  const data = c.req.valid("json");
  const item = await getMeetingService().create(data);
  publish("meeting.created");
  return c.json(item, 201);
});

// PUT /{id}
const updateRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Meetings"],
  summary: "Update a meeting",
  operationId: "updateMeeting",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateMeetingSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: MeetingSchema } },
      description: "Updated meeting",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

meetingsRouter.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const item = await getMeetingService().update(id, data);
  if (!item) return c.json(notFound("MEETING", id), 404);
  publish("meeting.updated");
  return c.json(item, 200);
});

// DELETE /{id}
const deleteRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Meetings"],
  summary: "Delete a meeting",
  operationId: "deleteMeeting",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

meetingsRouter.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getMeetingService().delete(id);
  if (!ok) return c.json(notFound("MEETING", id), 404);
  publish("meeting.deleted");
  return new Response(null, { status: 204 });
});

// ---------------------------------------------------------------------------
// Carry-over open actions
// ---------------------------------------------------------------------------

// GET /{id}/open-actions — open actions from all meetings before this one
meetingsRouter.openapi(
  createRoute({
    method: "get",
    path: "/{id}/open-actions",
    tags: ["Meetings"],
    summary: "Get open actions from meetings before this one",
    operationId: "getMeetingOpenActions",
    request: { params: IdParam },
    responses: {
      200: {
        description: "Carry-over section fragment",
        content: { "text/html": { schema: z.string() } },
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const meeting = await getMeetingService().getById(id);
    if (!meeting) return c.json(notFound("MEETING", id), 404);
    const entries = await getMeetingService().getOpenActions(meeting.date);
    return c.html(renderCarryoverSection(entries), 200);
  },
);

// ---------------------------------------------------------------------------
// Action item sub-resource routes
// ---------------------------------------------------------------------------

// POST /{id}/actions
meetingsRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/actions",
    tags: ["Meetings"],
    summary: "Add an action item to a meeting",
    operationId: "addMeetingAction",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: AddMeetingActionSchema } },
        required: true,
      },
    },
    responses: {
      200: {
        description: "Updated actions table fragment",
        content: { "text/html": { schema: z.string() } },
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const meeting = await getMeetingService().addAction(id, data);
    if (!meeting) return c.json(notFound("MEETING", id), 404);
    publish("meeting.updated");
    return c.html(renderActionsTable(meeting), 200);
  },
);

// PUT /{id}/actions/{actionId}/toggle
meetingsRouter.openapi(
  createRoute({
    method: "put",
    path: "/{id}/actions/{actionId}/toggle",
    tags: ["Meetings"],
    summary: "Toggle action item status open↔done",
    operationId: "toggleMeetingAction",
    request: { params: ActionIdParam },
    responses: {
      200: {
        description: "Updated actions table fragment",
        content: { "text/html": { schema: z.string() } },
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id, actionId } = c.req.valid("param");
    const meeting = await getMeetingService().toggleAction(id, actionId);
    if (!meeting) return c.json(notFound("MEETING", id), 404);
    publish("meeting.updated");
    return c.html(renderActionsTable(meeting), 200);
  },
);

// DELETE /{id}/actions/{actionId}
meetingsRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}/actions/{actionId}",
    tags: ["Meetings"],
    summary: "Delete an action item from a meeting",
    operationId: "deleteMeetingAction",
    request: { params: ActionIdParam },
    responses: {
      200: {
        description: "Updated actions table fragment",
        content: { "text/html": { schema: z.string() } },
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id, actionId } = c.req.valid("param");
    const meeting = await getMeetingService().deleteAction(id, actionId);
    if (!meeting) return c.json(notFound("MEETING", id), 404);
    publish("meeting.updated");
    const res = c.html(renderActionsTable(meeting), 200);
    res.headers.set(
      "HX-Trigger",
      JSON.stringify({ showToast: "Action deleted" }),
    );
    return res;
  },
);

// ---------------------------------------------------------------------------
// Related meeting links (undirected graph)
// ---------------------------------------------------------------------------

// POST /{id}/links
meetingsRouter.openapi(
  createRoute({
    method: "post",
    path: "/{id}/links",
    tags: ["Meetings"],
    summary: "Link two meetings (undirected)",
    operationId: "linkMeeting",
    request: {
      params: IdParam,
      body: {
        content: { "application/json": { schema: LinkMeetingSchema } },
        required: true,
      },
    },
    responses: {
      200: {
        description: "Updated related meetings section fragment",
        content: { "text/html": { schema: z.string() } },
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    const { linkedId } = c.req.valid("json");
    const result = await getMeetingService().linkMeetings(id, linkedId);
    if (!result) return c.json(notFound("MEETING", id), 404);
    publish("meeting.updated");
    const resolved = await Promise.all(
      (result.a.relatedMeetings ?? []).map((rid) =>
        getMeetingService().getById(rid)
      ),
    );
    const relatedItems = resolved.filter((m): m is Meeting => m !== null);
    return c.html(renderRelatedSection(result.a, relatedItems), 200);
  },
);

// DELETE /{id}/links/{linkedId}
meetingsRouter.openapi(
  createRoute({
    method: "delete",
    path: "/{id}/links/{linkedId}",
    tags: ["Meetings"],
    summary: "Unlink two meetings",
    operationId: "unlinkMeeting",
    request: { params: LinkedIdParam },
    responses: {
      200: {
        description: "Updated related meetings section fragment",
        content: { "text/html": { schema: z.string() } },
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not found",
      },
    },
  }),
  async (c) => {
    const { id, linkedId } = c.req.valid("param");
    const result = await getMeetingService().unlinkMeetings(id, linkedId);
    if (!result) return c.json(notFound("MEETING", id), 404);
    publish("meeting.updated");
    const resolved = await Promise.all(
      (result.a.relatedMeetings ?? []).map((rid) =>
        getMeetingService().getById(rid)
      ),
    );
    const relatedItems = resolved.filter((m): m is Meeting => m !== null);
    return c.html(renderRelatedSection(result.a, relatedItems), 200);
  },
);
