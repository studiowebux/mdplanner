/**
 * Retrospectives CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const retrospectivesRouter = new OpenAPIHono<{
  Variables: AppVariables;
}>();

const ErrorSchema = z
  .object({ error: z.string(), message: z.string().optional() })
  .openapi("RetrospectiveError");
const SuccessSchema = z
  .object({ success: z.boolean() })
  .openapi("RetrospectiveSuccess");
const SuccessWithIdSchema = z
  .object({ success: z.boolean(), id: z.string() })
  .openapi("RetrospectiveSuccessWithId");
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const stringArray = z.array(z.string());

const RetrospectiveSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    date: z.string(),
    status: z.enum(["open", "closed"]),
    continue: stringArray,
    stop: stringArray,
    start: stringArray,
  })
  .openapi("Retrospective");

const CreateRetrospectiveSchema = z
  .object({
    title: z.string().optional().openapi({
      description: "Retrospective title",
    }),
    date: z.string().optional().openapi({ description: "Date (YYYY-MM-DD)" }),
    status: z.enum(["open", "closed"]).optional(),
    continue: stringArray.optional(),
    stop: stringArray.optional(),
    start: stringArray.optional(),
  })
  .openapi("CreateRetrospective");

const UpdateRetrospectiveSchema = CreateRetrospectiveSchema.openapi(
  "UpdateRetrospective",
);

const listRetrospectivesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Retrospectives"],
  summary: "List all retrospectives",
  operationId: "listRetrospectives",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(RetrospectiveSchema) },
      },
      description: "List of retrospectives",
    },
  },
});

const createRetrospectiveRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Retrospectives"],
  summary: "Create retrospective",
  operationId: "createRetrospective",
  request: {
    body: {
      content: { "application/json": { schema: CreateRetrospectiveSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessWithIdSchema } },
      description: "Retrospective created",
    },
  },
});

const updateRetrospectiveRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Retrospectives"],
  summary: "Update retrospective",
  operationId: "updateRetrospective",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: UpdateRetrospectiveSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Retrospective updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteRetrospectiveRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Retrospectives"],
  summary: "Delete retrospective",
  operationId: "deleteRetrospective",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Retrospective deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

retrospectivesRouter.openapi(listRetrospectivesRoute, async (c) => {
  const parser = getParser(c);
  const retrospectives = await parser.readRetrospectives();
  return c.json(retrospectives, 200);
});

retrospectivesRouter.openapi(createRetrospectiveRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const retrospectives = await parser.readRetrospectives();
  const id = crypto.randomUUID().substring(0, 8);
  retrospectives.push({
    id,
    title: body.title || "",
    date: body.date || new Date().toISOString().split("T")[0],
    status: body.status || "open",
    continue: body.continue || [],
    stop: body.stop || [],
    start: body.start || [],
  });
  await parser.saveRetrospectives(retrospectives);
  await cacheWriteThrough(c, "retrospectives");
  return c.json({ success: true, id }, 201);
});

retrospectivesRouter.openapi(updateRetrospectiveRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const retrospectives = await parser.readRetrospectives();
  const index = retrospectives.findIndex((r) => r.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  retrospectives[index] = { ...retrospectives[index], ...body };
  await parser.saveRetrospectives(retrospectives);
  await cacheWriteThrough(c, "retrospectives");
  return c.json({ success: true }, 200);
});

retrospectivesRouter.openapi(deleteRetrospectiveRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const retrospectives = await parser.readRetrospectives();
  const filtered = retrospectives.filter((r) => r.id !== id);
  if (filtered.length === retrospectives.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveRetrospectives(filtered);
  cachePurge(c, "retrospectives", id);
  return c.json({ success: true }, 200);
});
