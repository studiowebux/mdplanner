/**
 * Lean Canvas CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const leanCanvasRouter = new OpenAPIHono<{
  Variables: AppVariables;
}>();

const ErrorSchema = z
  .object({ error: z.string(), message: z.string().optional() })
  .openapi("LeanCanvasError");
const SuccessSchema = z
  .object({ success: z.boolean() })
  .openapi("LeanCanvasSuccess");
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const stringArray = z.array(z.string());

const LeanCanvasSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    date: z.string(),
    problem: stringArray,
    solution: stringArray,
    uniqueValueProp: stringArray,
    unfairAdvantage: stringArray,
    customerSegments: stringArray,
    existingAlternatives: stringArray,
    keyMetrics: stringArray,
    highLevelConcept: stringArray,
    channels: stringArray,
    earlyAdopters: stringArray,
    costStructure: stringArray,
    revenueStreams: stringArray,
  })
  .openapi("LeanCanvas");

const CreateLeanCanvasSchema = z
  .object({
    title: z.string().optional().openapi({ description: "Canvas title" }),
    date: z.string().optional().openapi({ description: "Date (YYYY-MM-DD)" }),
    problem: stringArray.optional(),
    solution: stringArray.optional(),
    uniqueValueProp: stringArray.optional(),
    unfairAdvantage: stringArray.optional(),
    customerSegments: stringArray.optional(),
    existingAlternatives: stringArray.optional(),
    keyMetrics: stringArray.optional(),
    highLevelConcept: stringArray.optional(),
    channels: stringArray.optional(),
    earlyAdopters: stringArray.optional(),
    costStructure: stringArray.optional(),
    revenueStreams: stringArray.optional(),
  })
  .openapi("CreateLeanCanvas");

const UpdateLeanCanvasSchema = CreateLeanCanvasSchema.openapi(
  "UpdateLeanCanvas",
);

const listLeanCanvasRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Lean Canvas"],
  summary: "List all lean canvases",
  operationId: "listLeanCanvases",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(LeanCanvasSchema) } },
      description: "List of lean canvases",
    },
  },
});

const createLeanCanvasRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Lean Canvas"],
  summary: "Create lean canvas",
  operationId: "createLeanCanvas",
  request: {
    body: {
      content: { "application/json": { schema: CreateLeanCanvasSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: LeanCanvasSchema } },
      description: "Lean canvas created",
    },
  },
});

const updateLeanCanvasRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Lean Canvas"],
  summary: "Update lean canvas",
  operationId: "updateLeanCanvas",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: UpdateLeanCanvasSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Lean canvas updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteLeanCanvasRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Lean Canvas"],
  summary: "Delete lean canvas",
  operationId: "deleteLeanCanvas",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Lean canvas deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

leanCanvasRouter.openapi(listLeanCanvasRoute, async (c) => {
  const parser = getParser(c);
  const leanCanvases = await parser.readLeanCanvases();
  return c.json(leanCanvases, 200);
});

leanCanvasRouter.openapi(createLeanCanvasRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const leanCanvases = await parser.readLeanCanvases();
  const newCanvas = {
    id: crypto.randomUUID().substring(0, 8),
    title: body.title || "",
    date: body.date || new Date().toISOString().split("T")[0],
    problem: body.problem || [],
    solution: body.solution || [],
    uniqueValueProp: body.uniqueValueProp || [],
    unfairAdvantage: body.unfairAdvantage || [],
    customerSegments: body.customerSegments || [],
    existingAlternatives: body.existingAlternatives || [],
    keyMetrics: body.keyMetrics || [],
    highLevelConcept: body.highLevelConcept || [],
    channels: body.channels || [],
    earlyAdopters: body.earlyAdopters || [],
    costStructure: body.costStructure || [],
    revenueStreams: body.revenueStreams || [],
  };
  leanCanvases.push(newCanvas);
  await parser.saveLeanCanvases(leanCanvases);
  await cacheWriteThrough(c, "lean_canvas");
  return c.json(newCanvas, 201);
});

leanCanvasRouter.openapi(updateLeanCanvasRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const leanCanvases = await parser.readLeanCanvases();
  const index = leanCanvases.findIndex((lc) => lc.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  leanCanvases[index] = { ...leanCanvases[index], ...body };
  await parser.saveLeanCanvases(leanCanvases);
  await cacheWriteThrough(c, "lean_canvas");
  return c.json({ success: true }, 200);
});

leanCanvasRouter.openapi(deleteLeanCanvasRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const leanCanvases = await parser.readLeanCanvases();
  const filtered = leanCanvases.filter((lc) => lc.id !== id);
  if (filtered.length === leanCanvases.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveLeanCanvases(filtered);
  cachePurge(c, "lean_canvas", id);
  return c.json({ success: true }, 200);
});
