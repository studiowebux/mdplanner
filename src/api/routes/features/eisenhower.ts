/**
 * Eisenhower Matrix CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const eisenhowerRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

const listEisenhowerRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Eisenhower"],
  summary: "List all Eisenhower matrices",
  operationId: "listEisenhowerMatrices",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of Eisenhower matrices",
    },
  },
});

const createEisenhowerRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Eisenhower"],
  summary: "Create Eisenhower matrix",
  operationId: "createEisenhowerMatrix",
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
      description: "Eisenhower matrix created",
    },
  },
});

const updateEisenhowerRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Eisenhower"],
  summary: "Update Eisenhower matrix",
  operationId: "updateEisenhowerMatrix",
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
      description: "Updated Eisenhower matrix",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteEisenhowerRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Eisenhower"],
  summary: "Delete Eisenhower matrix",
  operationId: "deleteEisenhowerMatrix",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Eisenhower matrix deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

eisenhowerRouter.openapi(listEisenhowerRoute, async (c) => {
  const parser = getParser(c);
  const matrices = await parser.readEisenhowerMatrices();
  return c.json(matrices, 200);
});

eisenhowerRouter.openapi(createEisenhowerRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const matrix = await parser.addEisenhowerMatrix({
    title: body.title || "Untitled Matrix",
    date: body.date || new Date().toISOString().split("T")[0],
    urgentImportant: body.urgentImportant || [],
    notUrgentImportant: body.notUrgentImportant || [],
    urgentNotImportant: body.urgentNotImportant || [],
    notUrgentNotImportant: body.notUrgentNotImportant || [],
  });
  await cacheWriteThrough(c, "eisenhower");
  return c.json(matrix, 201);
});

eisenhowerRouter.openapi(updateEisenhowerRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const updated = await parser.updateEisenhowerMatrix(id, body);
  if (!updated) return c.json({ error: "Not found" }, 404);
  await cacheWriteThrough(c, "eisenhower");
  return c.json(updated, 200);
});

eisenhowerRouter.openapi(deleteEisenhowerRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const success = await parser.deleteEisenhowerMatrix(id);
  if (!success) return c.json({ error: "Not found" }, 404);
  cachePurge(c, "eisenhower", id);
  return c.json({ success: true }, 200);
});
