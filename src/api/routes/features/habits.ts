/**
 * Habit tracker CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  checkConflict,
  getParser,
} from "../context.ts";

export const habitsRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const idDateParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
  date: z.string().openapi({ param: { name: "date", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

const listHabitsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Habits"],
  summary: "List all habits",
  operationId: "listHabits",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of habits",
    },
  },
});

const getHabitRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Habits"],
  summary: "Get a single habit",
  operationId: "getHabit",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Habit",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createHabitRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Habits"],
  summary: "Create habit",
  operationId: "createHabit",
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
      description: "Habit created",
    },
  },
});

const updateHabitRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Habits"],
  summary: "Update habit metadata",
  operationId: "updateHabit",
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
      description: "Habit updated",
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

const markHabitCompleteRoute = createRoute({
  method: "post",
  path: "/{id}/complete",
  tags: ["Habits"],
  summary: "Mark habit complete for today or a specific date",
  operationId: "markHabitComplete",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Habit marked complete",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const unmarkHabitCompleteRoute = createRoute({
  method: "delete",
  path: "/{id}/complete/{date}",
  tags: ["Habits"],
  summary: "Unmark a specific date as complete",
  operationId: "unmarkHabitComplete",
  request: { params: idDateParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Habit completion unmarked",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteHabitRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Habits"],
  summary: "Delete habit",
  operationId: "deleteHabit",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Habit deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

habitsRouter.openapi(listHabitsRoute, async (c) => {
  const parser = getParser(c);
  const habits = await parser.readHabits();
  return c.json(habits, 200);
});

habitsRouter.openapi(getHabitRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const habits = await parser.readHabits();
  const habit = habits.find((h) => h.id === id);
  if (!habit) return c.json({ error: "Not found" }, 404);
  return c.json(habit, 200);
});

habitsRouter.openapi(createHabitRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const habit = await parser.addHabit({
    name: body.name || "",
    description: body.description,
    frequency: body.frequency ?? "daily",
    targetDays: body.targetDays,
    completions: body.completions ?? [],
    notes: body.notes,
  });
  await cacheWriteThrough(c, "habits");
  return c.json({ success: true, id: habit.id }, 201);
});

habitsRouter.openapi(updateHabitRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  const existing = await parser.readHabit(id);
  const conflict = checkConflict(existing?.updated, body.updatedAt);
  // deno-lint-ignore no-explicit-any
  if (conflict) return conflict as any;

  const updated = await parser.updateHabit(id, {
    name: body.name,
    description: body.description,
    frequency: body.frequency,
    targetDays: body.targetDays,
    dayNotes: body.dayNotes,
    notes: body.notes,
  });
  if (!updated) return c.json({ error: "Not found" }, 404);
  await cacheWriteThrough(c, "habits");
  return c.json({ success: true }, 200);
});

habitsRouter.openapi(markHabitCompleteRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  let date: string | undefined;
  try {
    const body = c.req.valid("json");
    date = body.date;
  } catch {
    // No body — mark today
  }
  const updated = await parser.markHabitComplete(id, date);
  if (!updated) return c.json({ error: "Not found" }, 404);
  await cacheWriteThrough(c, "habits");
  return c.json(updated, 200);
});

habitsRouter.openapi(unmarkHabitCompleteRoute, async (c) => {
  const parser = getParser(c);
  const { id, date } = c.req.valid("param");
  const updated = await parser.unmarkHabitComplete(id, date);
  if (!updated) return c.json({ error: "Not found" }, 404);
  await cacheWriteThrough(c, "habits");
  return c.json(updated, 200);
});

habitsRouter.openapi(deleteHabitRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const deleted = await parser.deleteHabit(id);
  if (!deleted) return c.json({ error: "Not found" }, 404);
  cachePurge(c, "habits", id);
  return c.json({ success: true }, 200);
});
