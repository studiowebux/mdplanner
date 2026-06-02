// Habit API routes — OpenAPI CRUD + mark/unmark complete + heatmap toggle.

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getHabitService } from "../../../singletons/services.ts";
import { publish } from "../../../singletons/event-bus.ts";
import {
  CreateHabitSchema,
  HabitSchema,
  ListHabitOptionsSchema,
  UpdateHabitSchema,
} from "../../../types/habit.types.ts";
import { ErrorSchema, IdParam, notFound } from "../../../types/api.ts";
import { renderToString } from "hono/jsx/dom/server";
import { HabitHeatmapRow } from "../../../views/habits/components/habit-heatmap.tsx";
import { HabitCard } from "../../../views/components/habit-card.tsx";
import { resolveUserScope } from "../../../utils/actor.ts";
import type { AppVariables } from "../../../types/app.ts";

export const habitApiRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const listHabitsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Habit"],
  summary: "List all habits",
  operationId: "listHabits",
  request: { query: ListHabitOptionsSchema },
  responses: {
    200: {
      content: { "application/json": { schema: z.array(HabitSchema) } },
      description: "List of habits",
    },
  },
});

habitApiRouter.openapi(listHabitsRoute, async (c) => {
  const { frequency, tag, q } = c.req.valid("query");
  const scope = await resolveUserScope(c);
  const items = await getHabitService().listForUser(
    { frequency, tag, q },
    scope,
  );
  return c.json(items, 200);
});

const getHabitRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Habit"],
  summary: "Get habit by ID",
  operationId: "getHabit",
  request: { params: IdParam },
  responses: {
    200: {
      content: { "application/json": { schema: HabitSchema } },
      description: "Habit",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

habitApiRouter.openapi(getHabitRoute, async (c) => {
  const { id } = c.req.valid("param");
  const scope = await resolveUserScope(c);
  const habit = await getHabitService().getForUser(id, scope);
  if (!habit) return c.json(notFound("Habit", id), 404);
  return c.json(habit, 200);
});

const createHabitRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Habit"],
  summary: "Create a habit",
  operationId: "createHabit",
  request: {
    body: {
      content: { "application/json": { schema: CreateHabitSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: HabitSchema } },
      description: "Created habit",
    },
  },
});

habitApiRouter.openapi(createHabitRoute, async (c) => {
  const data = c.req.valid("json");
  const habit = await getHabitService().create(data);
  publish("habit.created");
  return c.json(habit, 201);
});

const updateHabitRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Habit"],
  summary: "Update a habit",
  operationId: "updateHabit",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: UpdateHabitSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: HabitSchema } },
      description: "Updated habit",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

habitApiRouter.openapi(updateHabitRoute, async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");
  const habit = await getHabitService().update(id, data);
  if (!habit) return c.json(notFound("Habit", id), 404);
  publish("habit.updated");
  return c.json(habit, 200);
});

const deleteHabitRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Habit"],
  summary: "Delete a habit",
  operationId: "deleteHabit",
  request: { params: IdParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

habitApiRouter.openapi(deleteHabitRoute, async (c) => {
  const { id } = c.req.valid("param");
  const ok = await getHabitService().delete(id);
  if (!ok) return c.json(notFound("Habit", id), 404);
  publish("habit.deleted");
  return new Response(null, { status: 204 });
});

const DateBody = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
const CheckTodayBody = z.object({ note: z.string().optional() });

const markCompleteRoute = createRoute({
  method: "patch",
  path: "/{id}/complete",
  tags: ["Habit"],
  summary: "Mark habit complete for a date",
  operationId: "markHabitComplete",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: DateBody } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: HabitSchema } },
      description: "Updated habit",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

habitApiRouter.openapi(markCompleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { date } = c.req.valid("json");
  const scope = await resolveUserScope(c);
  const habit = await getHabitService().markComplete(id, date, scope);
  if (!habit) return c.json(notFound("Habit", id), 404);
  publish("habit.updated");
  return c.json(habit, 200);
});

const unmarkCompleteRoute = createRoute({
  method: "patch",
  path: "/{id}/uncomplete",
  tags: ["Habit"],
  summary: "Unmark habit complete for a date",
  operationId: "unmarkHabitComplete",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: DateBody } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: HabitSchema } },
      description: "Updated habit",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

habitApiRouter.openapi(unmarkCompleteRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { date } = c.req.valid("json");
  const scope = await resolveUserScope(c);
  const habit = await getHabitService().unmarkComplete(id, date, scope);
  if (!habit) return c.json(notFound("Habit", id), 404);
  publish("habit.updated");
  return c.json(habit, 200);
});

// ── toggle-date — heatmap cell click ──────────────────────────────────────

const ToggleDateParam = IdParam.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const toggleDateRoute = createRoute({
  method: "post",
  path: "/{id}/toggle-date/{date}",
  tags: ["Habit"],
  summary: "Toggle habit completion for a specific date",
  operationId: "toggleHabitDate",
  request: { params: ToggleDateParam },
  responses: {
    200: { description: "Updated heatmap row HTML" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

habitApiRouter.openapi(toggleDateRoute, async (c) => {
  const { id, date } = c.req.valid("param");
  const scope = await resolveUserScope(c);
  const habit = await getHabitService().toggleDate(id, date, scope);
  if (!habit) return c.json(notFound("Habit", id), 404);
  publish("habit.updated");
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const mm = String(month + 1).padStart(2, "0");
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return { date: `${year}-${mm}-${String(d).padStart(2, "0")}`, day: d };
  });
  return c.html(
    renderToString(<HabitHeatmapRow habit={habit} days={days} today={today} />),
    200,
  );
});

// ── check-today — card quick-check ────────────────────────────────────────

const checkTodayRoute = createRoute({
  method: "post",
  path: "/{id}/check-today",
  tags: ["Habit"],
  summary: "Mark habit done today with optional note",
  operationId: "checkHabitToday",
  request: {
    params: IdParam,
    body: {
      content: { "application/json": { schema: CheckTodayBody } },
      required: false,
    },
  },
  responses: {
    200: { description: "Updated habit card HTML" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

habitApiRouter.openapi(checkTodayRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { note } = c.req.valid("json");
  const scope = await resolveUserScope(c);
  const habit = await getHabitService().checkToday(id, scope, note);
  if (!habit) return c.json(notFound("Habit", id), 404);
  publish("habit.updated");
  const res = c.html(renderToString(<HabitCard item={habit} />), 200);
  res.headers.set("HX-Trigger", JSON.stringify({ "habit.updated": null }));
  return res;
});

// ── DELETE completion/:date ───────────────────────────────────────────────

const DeleteCompletionParam = IdParam.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const deleteCompletionRoute = createRoute({
  method: "delete",
  path: "/{id}/completion/{date}",
  tags: ["Habit"],
  summary: "Delete a completion entry by date",
  operationId: "deleteHabitCompletion",
  request: { params: DeleteCompletionParam },
  responses: {
    204: { description: "Deleted" },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

habitApiRouter.openapi(deleteCompletionRoute, async (c) => {
  const { id, date } = c.req.valid("param");
  const scope = await resolveUserScope(c);
  const habit = await getHabitService().deleteCompletion(id, date, scope);
  if (!habit) return c.json(notFound("Habit", id), 404);
  publish("habit.updated");
  return new Response(null, { status: 204 });
});
