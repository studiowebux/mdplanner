/**
 * Habit tracker CRUD routes.
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

export const habitsRouter = new Hono<{ Variables: AppVariables }>();

// GET /habits - list all habits
habitsRouter.get("/", async (c) => {
  const parser = getParser(c);
  const habits = await parser.readHabits();
  return jsonResponse(habits);
});

// GET /habits/:id - single habit
habitsRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const habits = await parser.readHabits();
  const habit = habits.find((h) => h.id === id);
  if (!habit) return errorResponse("Not found", 404);
  return jsonResponse(habit);
});

// POST /habits - create habit
habitsRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const habit = await parser.addHabit({
    name: body.name || "",
    description: body.description,
    frequency: body.frequency ?? "daily",
    targetDays: body.targetDays,
    completions: body.completions ?? [],
    notes: body.notes,
  });
  await cacheWriteThrough(c, "habits");
  return jsonResponse({ success: true, id: habit.id }, 201);
});

// PUT /habits/:id - update habit metadata
habitsRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await parser.updateHabit(id, {
    name: body.name,
    description: body.description,
    frequency: body.frequency,
    targetDays: body.targetDays,
    notes: body.notes,
  });
  if (!updated) return errorResponse("Not found", 404);
  await cacheWriteThrough(c, "habits");
  return jsonResponse({ success: true });
});

// POST /habits/:id/complete - mark today (or a specific date) as done
habitsRouter.post("/:id/complete", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  let date: string | undefined;
  try {
    const body = await c.req.json();
    date = body.date;
  } catch {
    // No body — mark today
  }
  const updated = await parser.markHabitComplete(id, date);
  if (!updated) return errorResponse("Not found", 404);
  await cacheWriteThrough(c, "habits");
  return jsonResponse(updated);
});

// DELETE /habits/:id/complete/:date - unmark a specific date
habitsRouter.delete("/:id/complete/:date", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const date = c.req.param("date");
  const updated = await parser.unmarkHabitComplete(id, date);
  if (!updated) return errorResponse("Not found", 404);
  await cacheWriteThrough(c, "habits");
  return jsonResponse(updated);
});

// DELETE /habits/:id - delete habit
habitsRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const deleted = await parser.deleteHabit(id);
  if (!deleted) return errorResponse("Not found", 404);
  cachePurge(c, "habits", id);
  return jsonResponse({ success: true });
});
