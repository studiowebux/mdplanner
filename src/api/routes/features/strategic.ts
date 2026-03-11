/**
 * Strategic Levels routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const strategicRouter = new OpenAPIHono<{ Variables: AppVariables }>();

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });
const levelParams = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
  levelId: z.string().openapi({ param: { name: "levelId", in: "path" } }),
});

const StrategicLevelSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    level: z.enum([
      "vision",
      "mission",
      "goals",
      "objectives",
      "strategies",
      "tactics",
    ]),
    parentId: z.string().optional(),
    order: z.number(),
    linkedTasks: z.array(z.string()).optional(),
    linkedMilestones: z.array(z.string()).optional(),
  })
  .openapi("StrategicLevel");

const StrategicLevelsBuilderSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    date: z.string(),
    levels: z.array(StrategicLevelSchema),
  })
  .openapi("StrategicLevelsBuilder");

const CreateStrategicLevelsBuilderSchema = z
  .object({
    title: z.string().optional().openapi({ description: "Builder title" }),
    date: z.string().optional().openapi({ description: "Date (YYYY-MM-DD)" }),
    levels: z.array(StrategicLevelSchema).optional().openapi({
      description: "Initial levels",
    }),
  })
  .openapi("CreateStrategicLevelsBuilder");

const UpdateStrategicLevelsBuilderSchema = z
  .object({
    title: z.string().optional(),
    date: z.string().optional(),
    levels: z.array(StrategicLevelSchema).optional(),
  })
  .openapi("UpdateStrategicLevelsBuilder");

const CreateStrategicLevelSchema = z
  .object({
    title: z.string().openapi({ description: "Level title" }),
    description: z.string().optional(),
    level: z.enum([
      "vision",
      "mission",
      "goals",
      "objectives",
      "strategies",
      "tactics",
    ]),
    parentId: z.string().optional(),
    linkedTasks: z.array(z.string()).optional(),
    linkedMilestones: z.array(z.string()).optional(),
  })
  .openapi("CreateStrategicLevel");

const UpdateStrategicLevelSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    level: z
      .enum([
        "vision",
        "mission",
        "goals",
        "objectives",
        "strategies",
        "tactics",
      ])
      .optional(),
    parentId: z.string().optional(),
    order: z.number().optional(),
    linkedTasks: z.array(z.string()).optional(),
    linkedMilestones: z.array(z.string()).optional(),
  })
  .openapi("UpdateStrategicLevel");

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

const listStrategicRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Strategic Levels"],
  summary: "List all strategic levels builders",
  operationId: "listStrategicLevels",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(StrategicLevelsBuilderSchema) },
      },
      description: "List of strategic levels builders",
    },
  },
});

const createStrategicRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Strategic Levels"],
  summary: "Create strategic levels builder",
  operationId: "createStrategicLevels",
  request: {
    body: {
      content: {
        "application/json": { schema: CreateStrategicLevelsBuilderSchema },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        "application/json": { schema: StrategicLevelsBuilderSchema },
      },
      description: "Strategic levels builder created",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid input",
    },
  },
});

const getStrategicRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Strategic Levels"],
  summary: "Get single strategic levels builder",
  operationId: "getStrategicLevels",
  request: { params: idParam },
  responses: {
    200: {
      content: {
        "application/json": { schema: StrategicLevelsBuilderSchema },
      },
      description: "Strategic levels builder details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const updateStrategicRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Strategic Levels"],
  summary: "Update strategic levels builder",
  operationId: "updateStrategicLevels",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: UpdateStrategicLevelsBuilderSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: StrategicLevelsBuilderSchema },
      },
      description: "Updated strategic levels builder",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid input",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteStrategicRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Strategic Levels"],
  summary: "Delete strategic levels builder",
  operationId: "deleteStrategicLevels",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Strategic levels builder deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const addLevelRoute = createRoute({
  method: "post",
  path: "/{id}/levels",
  tags: ["Strategic Levels"],
  summary: "Add level to strategic levels builder",
  operationId: "addStrategicLevel",
  request: {
    params: idParam,
    body: {
      content: {
        "application/json": { schema: CreateStrategicLevelSchema },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: StrategicLevelSchema } },
      description: "Level added",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid input",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Builder not found",
    },
  },
});

const updateLevelRoute = createRoute({
  method: "put",
  path: "/{id}/levels/{levelId}",
  tags: ["Strategic Levels"],
  summary: "Update level in strategic levels builder",
  operationId: "updateStrategicLevel",
  request: {
    params: levelParams,
    body: {
      content: {
        "application/json": { schema: UpdateStrategicLevelSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: StrategicLevelSchema } },
      description: "Level updated",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid input",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteLevelRoute = createRoute({
  method: "delete",
  path: "/{id}/levels/{levelId}",
  tags: ["Strategic Levels"],
  summary: "Delete level from strategic levels builder",
  operationId: "deleteStrategicLevel",
  request: { params: levelParams },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Level deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

strategicRouter.openapi(listStrategicRoute, async (c) => {
  const parser = getParser(c);
  const builders = await parser.readStrategicLevelsBuilders();
  return c.json(builders, 200);
});

strategicRouter.openapi(createStrategicRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
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
  return c.json(newBuilder, 201);
});

strategicRouter.openapi(getStrategicRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const builders = await parser.readStrategicLevelsBuilders();
  const builder = builders.find((b) => b.id === id);
  if (!builder) return c.json({ error: "Not found" }, 404);
  return c.json(builder, 200);
});

strategicRouter.openapi(updateStrategicRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const builders = await parser.readStrategicLevelsBuilders();
  const index = builders.findIndex((b) => b.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  builders[index] = { ...builders[index], ...body };
  await parser.saveStrategicLevelsBuilders(builders);
  await cacheWriteThrough(c, "strategic_builders");
  return c.json(builders[index], 200);
});

strategicRouter.openapi(deleteStrategicRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const builders = await parser.readStrategicLevelsBuilders();
  const filtered = builders.filter((b) => b.id !== id);
  if (filtered.length === builders.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveStrategicLevelsBuilders(filtered);
  cachePurge(c, "strategic_builders", id);
  return c.json({ success: true }, 200);
});

strategicRouter.openapi(addLevelRoute, async (c) => {
  const parser = getParser(c);
  const { id: builderId } = c.req.valid("param");
  const body = c.req.valid("json");
  const builders = await parser.readStrategicLevelsBuilders();
  const builder = builders.find((b) => b.id === builderId);
  if (!builder) return c.json({ error: "Builder not found" }, 404);
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
  return c.json(newLevel, 201);
});

strategicRouter.openapi(updateLevelRoute, async (c) => {
  const parser = getParser(c);
  const { id: builderId, levelId } = c.req.valid("param");
  const body = c.req.valid("json");
  const builders = await parser.readStrategicLevelsBuilders();
  const builder = builders.find((b) => b.id === builderId);
  if (!builder) return c.json({ error: "Builder not found" }, 404);
  const levelIndex = builder.levels.findIndex((l) => l.id === levelId);
  if (levelIndex === -1) return c.json({ error: "Level not found" }, 404);
  builder.levels[levelIndex] = { ...builder.levels[levelIndex], ...body };
  await parser.saveStrategicLevelsBuilders(builders);
  await cacheWriteThrough(c, "strategic_builders");
  return c.json(builder.levels[levelIndex], 200);
});

strategicRouter.openapi(deleteLevelRoute, async (c) => {
  const parser = getParser(c);
  const { id: builderId, levelId } = c.req.valid("param");
  const builders = await parser.readStrategicLevelsBuilders();
  const builder = builders.find((b) => b.id === builderId);
  if (!builder) return c.json({ error: "Builder not found" }, 404);
  const filtered = builder.levels.filter((l) => l.id !== levelId);
  if (filtered.length === builder.levels.length) {
    return c.json({ error: "Level not found" }, 404);
  }
  builder.levels = filtered.map((l) => {
    if (l.parentId === levelId) {
      return { ...l, parentId: undefined };
    }
    return l;
  });
  await parser.saveStrategicLevelsBuilders(builders);
  await cacheWriteThrough(c, "strategic_builders");
  return c.json({ success: true }, 200);
});
