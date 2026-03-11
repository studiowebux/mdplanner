/**
 * Business Model Canvas CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const businessModelRouter = new OpenAPIHono<{
  Variables: AppVariables;
}>();

const ErrorSchema = z
  .object({ error: z.string(), message: z.string().optional() })
  .openapi("BusinessModelError");
const SuccessSchema = z
  .object({ success: z.boolean() })
  .openapi("BusinessModelSuccess");
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const stringArray = z.array(z.string());

const BusinessModelSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    date: z.string(),
    keyPartners: stringArray,
    keyActivities: stringArray,
    keyResources: stringArray,
    valueProposition: stringArray,
    customerRelationships: stringArray,
    channels: stringArray,
    customerSegments: stringArray,
    costStructure: stringArray,
    revenueStreams: stringArray,
  })
  .openapi("BusinessModel");

const CreateBusinessModelSchema = z
  .object({
    title: z.string().optional().openapi({ description: "Canvas title" }),
    date: z.string().optional().openapi({ description: "Date (YYYY-MM-DD)" }),
    keyPartners: stringArray.optional(),
    keyActivities: stringArray.optional(),
    keyResources: stringArray.optional(),
    valueProposition: stringArray.optional(),
    customerRelationships: stringArray.optional(),
    channels: stringArray.optional(),
    customerSegments: stringArray.optional(),
    costStructure: stringArray.optional(),
    revenueStreams: stringArray.optional(),
  })
  .openapi("CreateBusinessModel");

const UpdateBusinessModelSchema = CreateBusinessModelSchema.openapi(
  "UpdateBusinessModel",
);

const listBusinessModelRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Business Model"],
  summary: "List all business model canvases",
  operationId: "listBusinessModelCanvases",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(BusinessModelSchema) },
      },
      description: "List of business model canvases",
    },
  },
});

const createBusinessModelRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Business Model"],
  summary: "Create business model canvas",
  operationId: "createBusinessModelCanvas",
  request: {
    body: {
      content: { "application/json": { schema: CreateBusinessModelSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: BusinessModelSchema } },
      description: "Business model canvas created",
    },
  },
});

const updateBusinessModelRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Business Model"],
  summary: "Update business model canvas",
  operationId: "updateBusinessModelCanvas",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: UpdateBusinessModelSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Business model canvas updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteBusinessModelRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Business Model"],
  summary: "Delete business model canvas",
  operationId: "deleteBusinessModelCanvas",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Business model canvas deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

businessModelRouter.openapi(listBusinessModelRoute, async (c) => {
  const parser = getParser(c);
  const canvases = await parser.readBusinessModelCanvases();
  return c.json(canvases, 200);
});

businessModelRouter.openapi(createBusinessModelRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const canvases = await parser.readBusinessModelCanvases();
  const newCanvas = {
    id: crypto.randomUUID().substring(0, 8),
    title: body.title || "",
    date: body.date || new Date().toISOString().split("T")[0],
    keyPartners: body.keyPartners || [],
    keyActivities: body.keyActivities || [],
    keyResources: body.keyResources || [],
    valueProposition: body.valueProposition || [],
    customerRelationships: body.customerRelationships || [],
    channels: body.channels || [],
    customerSegments: body.customerSegments || [],
    costStructure: body.costStructure || [],
    revenueStreams: body.revenueStreams || [],
  };
  canvases.push(newCanvas);
  await parser.saveBusinessModelCanvases(canvases);
  await cacheWriteThrough(c, "business_model");
  return c.json(newCanvas, 201);
});

businessModelRouter.openapi(updateBusinessModelRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const canvases = await parser.readBusinessModelCanvases();
  const index = canvases.findIndex((bm) => bm.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  canvases[index] = { ...canvases[index], ...body };
  await parser.saveBusinessModelCanvases(canvases);
  await cacheWriteThrough(c, "business_model");
  return c.json({ success: true }, 200);
});

businessModelRouter.openapi(deleteBusinessModelRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const canvases = await parser.readBusinessModelCanvases();
  const filtered = canvases.filter((bm) => bm.id !== id);
  if (filtered.length === canvases.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveBusinessModelCanvases(filtered);
  cachePurge(c, "business_model", id);
  return c.json({ success: true }, 200);
});
