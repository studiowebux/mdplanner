/**
 * Fishbone (Ishikawa) Diagram CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const fishboneRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z
  .object({ error: z.string(), message: z.string().optional() })
  .openapi("FishboneError");
const SuccessSchema = z
  .object({ success: z.boolean() })
  .openapi("FishboneSuccess");
const SuccessWithIdSchema = z
  .object({ success: z.boolean(), id: z.string() })
  .openapi("FishboneSuccessWithId");
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const FishboneCauseSchema = z
  .object({
    category: z.string(),
    subcauses: z.array(z.string()),
  })
  .openapi("FishboneCause");

const FishboneSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    causes: z.array(FishboneCauseSchema),
    created: z.string(),
    updated: z.string(),
  })
  .openapi("Fishbone");

const CreateFishboneSchema = z
  .object({
    title: z.string().optional().openapi({ description: "Problem statement" }),
    description: z.string().optional(),
    causes: z.array(FishboneCauseSchema).optional(),
  })
  .openapi("CreateFishbone");

const UpdateFishboneSchema = CreateFishboneSchema.openapi("UpdateFishbone");

// --- Route definitions ---

const listFishbonesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Fishbone"],
  summary: "List all fishbone diagrams",
  operationId: "listFishbones",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(FishboneSchema) } },
      description: "List of fishbone diagrams",
    },
  },
});

const getFishboneRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Fishbone"],
  summary: "Get single fishbone diagram",
  operationId: "getFishbone",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: FishboneSchema } },
      description: "Fishbone diagram details",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createFishboneRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Fishbone"],
  summary: "Create fishbone diagram",
  operationId: "createFishbone",
  request: {
    body: {
      content: { "application/json": { schema: CreateFishboneSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessWithIdSchema } },
      description: "Fishbone diagram created",
    },
  },
});

const updateFishboneRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Fishbone"],
  summary: "Update fishbone diagram",
  operationId: "updateFishbone",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: UpdateFishboneSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Fishbone diagram updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteFishboneRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Fishbone"],
  summary: "Delete fishbone diagram",
  operationId: "deleteFishbone",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Fishbone diagram deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

fishboneRouter.openapi(listFishbonesRoute, async (c) => {
  const parser = getParser(c);
  const diagrams = await parser.readFishbones();
  return c.json(diagrams, 200);
});

fishboneRouter.openapi(getFishboneRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const diagrams = await parser.readFishbones();
  const diagram = diagrams.find((d) => d.id === id);
  if (!diagram) return c.json({ error: "Not found" }, 404);
  return c.json(diagram, 200);
});

fishboneRouter.openapi(createFishboneRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const diagram = await parser.addFishbone({
    title: body.title || "Untitled Diagram",
    description: body.description,
    causes: body.causes ?? [],
  });
  await cacheWriteThrough(c, "fishbone");
  return c.json({ success: true, id: diagram.id }, 201);
});

fishboneRouter.openapi(updateFishboneRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const updated = await parser.updateFishbone(id, {
    title: body.title,
    description: body.description,
    causes: body.causes,
  });
  if (!updated) return c.json({ error: "Not found" }, 404);
  await cacheWriteThrough(c, "fishbone");
  return c.json({ success: true }, 200);
});

fishboneRouter.openapi(deleteFishboneRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const deleted = await parser.deleteFishbone(id);
  if (!deleted) return c.json({ error: "Not found" }, 404);
  cachePurge(c, "fishbone", id);
  return c.json({ success: true }, 200);
});
