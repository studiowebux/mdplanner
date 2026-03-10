/**
 * SWOT Analysis CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const swotRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

const listSwotRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["SWOT"],
  summary: "List all SWOT analyses",
  operationId: "listSwotAnalyses",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of SWOT analyses",
    },
  },
});

const createSwotRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["SWOT"],
  summary: "Create SWOT analysis",
  operationId: "createSwotAnalysis",
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
      description: "SWOT analysis created",
    },
  },
});

const updateSwotRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["SWOT"],
  summary: "Update SWOT analysis",
  operationId: "updateSwotAnalysis",
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
      description: "SWOT analysis updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteSwotRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["SWOT"],
  summary: "Delete SWOT analysis",
  operationId: "deleteSwotAnalysis",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "SWOT analysis deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

swotRouter.openapi(listSwotRoute, async (c) => {
  const parser = getParser(c);
  const swotAnalyses = await parser.readSwotAnalyses();
  return c.json(swotAnalyses, 200);
});

swotRouter.openapi(createSwotRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const swotAnalyses = await parser.readSwotAnalyses();
  const id = crypto.randomUUID().substring(0, 8);
  swotAnalyses.push({
    id,
    title: body.title,
    date: body.date || new Date().toISOString().split("T")[0],
    strengths: body.strengths || [],
    weaknesses: body.weaknesses || [],
    opportunities: body.opportunities || [],
    threats: body.threats || [],
  });
  await parser.saveSwotAnalyses(swotAnalyses);
  await cacheWriteThrough(c, "swot");
  return c.json({ success: true, id }, 201);
});

swotRouter.openapi(updateSwotRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const swotAnalyses = await parser.readSwotAnalyses();
  const index = swotAnalyses.findIndex((s) => s.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  swotAnalyses[index] = { ...swotAnalyses[index], ...body };
  await parser.saveSwotAnalyses(swotAnalyses);
  await cacheWriteThrough(c, "swot");
  return c.json({ success: true }, 200);
});

swotRouter.openapi(deleteSwotRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const swotAnalyses = await parser.readSwotAnalyses();
  const filtered = swotAnalyses.filter((s) => s.id !== id);
  if (filtered.length === swotAnalyses.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveSwotAnalyses(filtered);
  cachePurge(c, "swot", id);
  return c.json({ success: true }, 200);
});
