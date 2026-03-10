/**
 * MoSCoW Analysis CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const moscowRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

const listMoscowRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["MoSCoW"],
  summary: "List all MoSCoW analyses",
  operationId: "listMoscowAnalyses",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of MoSCoW analyses",
    },
  },
});

const createMoscowRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["MoSCoW"],
  summary: "Create MoSCoW analysis",
  operationId: "createMoscowAnalysis",
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
      content: { "application/json": { schema: z.any() } },
      description: "MoSCoW analysis created",
    },
  },
});

const updateMoscowRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["MoSCoW"],
  summary: "Update MoSCoW analysis",
  operationId: "updateMoscowAnalysis",
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
      content: { "application/json": { schema: z.any() } },
      description: "Updated MoSCoW analysis",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteMoscowRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["MoSCoW"],
  summary: "Delete MoSCoW analysis",
  operationId: "deleteMoscowAnalysis",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "MoSCoW analysis deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

moscowRouter.openapi(listMoscowRoute, async (c) => {
  const parser = getParser(c);
  const analyses = await parser.readMoscowAnalyses();
  return c.json(analyses, 200);
});

moscowRouter.openapi(createMoscowRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const analysis = await parser.addMoscowAnalysis({
    title: body.title || "Untitled Analysis",
    date: body.date || new Date().toISOString().split("T")[0],
    must: body.must || [],
    should: body.should || [],
    could: body.could || [],
    wont: body.wont || [],
  });
  await cacheWriteThrough(c, "moscow");
  return c.json(analysis, 201);
});

moscowRouter.openapi(updateMoscowRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const updated = await parser.updateMoscowAnalysis(id, body);
  if (!updated) return c.json({ error: "Not found" }, 404);
  await cacheWriteThrough(c, "moscow");
  return c.json(updated, 200);
});

moscowRouter.openapi(deleteMoscowRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const success = await parser.deleteMoscowAnalysis(id);
  if (!success) return c.json({ error: "Not found" }, 404);
  cachePurge(c, "moscow", id);
  return c.json({ success: true }, 200);
});
