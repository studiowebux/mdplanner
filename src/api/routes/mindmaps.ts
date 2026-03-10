/**
 * Mindmap CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "./context.ts";

export const mindmapsRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

// --- Route definitions ---

const listMindmapsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Mindmaps"],
  summary: "List all mindmaps",
  operationId: "listMindmaps",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of mindmaps",
    },
  },
});

const getMindmapRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Mindmaps"],
  summary: "Get single mindmap",
  operationId: "getMindmap",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "Mindmap details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createMindmapRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Mindmaps"],
  summary: "Create mindmap",
  operationId: "createMindmap",
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
        "application/json": { schema: z.object({ id: z.string() }) },
      },
      description: "Mindmap created",
    },
  },
});

const updateMindmapRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Mindmaps"],
  summary: "Update mindmap",
  operationId: "updateMindmap",
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
      description: "Mindmap updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteMindmapRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Mindmaps"],
  summary: "Delete mindmap",
  operationId: "deleteMindmap",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Mindmap deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

mindmapsRouter.openapi(listMindmapsRoute, async (c) => {
  const parser = getParser(c);
  const projectInfo = await parser.readProjectInfo();
  return c.json(projectInfo.mindmaps, 200);
});

mindmapsRouter.openapi(getMindmapRoute, async (c) => {
  const parser = getParser(c);
  const { id: mindmapId } = c.req.valid("param");
  const projectInfo = await parser.readProjectInfo();
  const mindmap = projectInfo.mindmaps.find((m) => m.id === mindmapId);
  if (mindmap) {
    return c.json(mindmap, 200);
  }
  return c.json({ error: "Mindmap not found" }, 404);
});

mindmapsRouter.openapi(createMindmapRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const mindmapId = await parser.addMindmap(body);
  await cacheWriteThrough(c, "mindmaps");
  return c.json({ id: mindmapId }, 201);
});

mindmapsRouter.openapi(updateMindmapRoute, async (c) => {
  const parser = getParser(c);
  const { id: mindmapId } = c.req.valid("param");
  const updates = c.req.valid("json");
  const success = await parser.updateMindmap(mindmapId, updates);
  if (success) {
    await cacheWriteThrough(c, "mindmaps");
    return c.json({ success: true }, 200);
  }
  return c.json({ error: "Mindmap not found" }, 404);
});

mindmapsRouter.openapi(deleteMindmapRoute, async (c) => {
  const parser = getParser(c);
  const { id: mindmapId } = c.req.valid("param");
  const success = await parser.deleteMindmap(mindmapId);
  if (success) {
    cachePurge(c, "mindmaps", mindmapId);
    return c.json({ success: true }, 200);
  }
  return c.json({ error: "Mindmap not found" }, 404);
});
