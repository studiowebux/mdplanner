/**
 * Strategic Levels routes.
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

export const strategicRouter = new Hono<{ Variables: AppVariables }>();

// GET /strategic-levels - list all strategic levels builders
strategicRouter.get("/", async (c) => {
  const parser = getParser(c);
  const builders = await parser.readStrategicLevelsBuilders();
  return jsonResponse(builders);
});

// POST /strategic-levels - create strategic levels builder
strategicRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const builders = await parser.readStrategicLevelsBuilders();
  const newBuilder = {
    id: crypto.randomUUID().substring(0, 8),
    title: body.title || "New Strategy",
    date: body.date || new Date().toISOString().split("T")[0],
    levels: body.levels || [],
  };
  builders.push(newBuilder);
  await parser.saveStrategicLevelsBuilders(builders);
  await cacheWriteThrough(c, "strategic_builders");
  return jsonResponse(newBuilder, 201);
});

// GET /strategic-levels/:id - get single strategic levels builder
strategicRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const builders = await parser.readStrategicLevelsBuilders();
  const builder = builders.find((b) => b.id === id);
  if (!builder) return errorResponse("Not found", 404);
  return jsonResponse(builder);
});

// PUT /strategic-levels/:id - update strategic levels builder
strategicRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const builders = await parser.readStrategicLevelsBuilders();
  const index = builders.findIndex((b) => b.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  builders[index] = { ...builders[index], ...body };
  await parser.saveStrategicLevelsBuilders(builders);
  await cacheWriteThrough(c, "strategic_builders");
  return jsonResponse(builders[index]);
});

// DELETE /strategic-levels/:id - delete strategic levels builder
strategicRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const builders = await parser.readStrategicLevelsBuilders();
  const filtered = builders.filter((b) => b.id !== id);
  if (filtered.length === builders.length) {
    return errorResponse("Not found", 404);
  }
  await parser.saveStrategicLevelsBuilders(filtered);
  cachePurge(c, "strategic_builders", id);
  return jsonResponse({ success: true });
});

// POST /strategic-levels/:id/levels - add level
strategicRouter.post("/:id/levels", async (c) => {
  const parser = getParser(c);
  const builderId = c.req.param("id");
  const body = await c.req.json();
  const builders = await parser.readStrategicLevelsBuilders();
  const builder = builders.find((b) => b.id === builderId);
  if (!builder) return errorResponse("Builder not found", 404);

  const newLevel = {
    id: crypto.randomUUID().substring(0, 8),
    title: body.title,
    description: body.description,
    level: body.level,
    parentId: body.parentId,
    order: builder.levels.filter((l) => l.level === body.level).length,
    linkedTasks: body.linkedTasks || [],
    linkedMilestones: body.linkedMilestones || [],
  };
  builder.levels.push(newLevel);
  await parser.saveStrategicLevelsBuilders(builders);
  await cacheWriteThrough(c, "strategic_builders");
  return jsonResponse(newLevel, 201);
});

// PUT /strategic-levels/:id/levels/:levelId - update level
strategicRouter.put("/:id/levels/:levelId", async (c) => {
  const parser = getParser(c);
  const builderId = c.req.param("id");
  const levelId = c.req.param("levelId");
  const body = await c.req.json();
  const builders = await parser.readStrategicLevelsBuilders();
  const builder = builders.find((b) => b.id === builderId);
  if (!builder) return errorResponse("Builder not found", 404);

  const levelIndex = builder.levels.findIndex((l) => l.id === levelId);
  if (levelIndex === -1) return errorResponse("Level not found", 404);

  builder.levels[levelIndex] = { ...builder.levels[levelIndex], ...body };
  await parser.saveStrategicLevelsBuilders(builders);
  await cacheWriteThrough(c, "strategic_builders");
  return jsonResponse(builder.levels[levelIndex]);
});

// DELETE /strategic-levels/:id/levels/:levelId - delete level
strategicRouter.delete("/:id/levels/:levelId", async (c) => {
  const parser = getParser(c);
  const builderId = c.req.param("id");
  const levelId = c.req.param("levelId");
  const builders = await parser.readStrategicLevelsBuilders();
  const builder = builders.find((b) => b.id === builderId);
  if (!builder) return errorResponse("Builder not found", 404);

  const filtered = builder.levels.filter((l) => l.id !== levelId);
  if (filtered.length === builder.levels.length) {
    return errorResponse("Level not found", 404);
  }

  builder.levels = filtered.map((l) => {
    if (l.parentId === levelId) {
      return { ...l, parentId: undefined };
    }
    return l;
  });
  await parser.saveStrategicLevelsBuilders(builders);
  await cacheWriteThrough(c, "strategic_builders");
  return jsonResponse({ success: true });
});
