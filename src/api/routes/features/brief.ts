/**
 * Brief CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const briefRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

const listBriefsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Briefs"],
  summary: "List all briefs",
  operationId: "listBriefs",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of briefs",
    },
  },
});

const createBriefRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Briefs"],
  summary: "Create brief",
  operationId: "createBrief",
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
      description: "Brief created",
    },
  },
});

const updateBriefRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Briefs"],
  summary: "Update brief",
  operationId: "updateBrief",
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
      description: "Updated brief",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteBriefRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Briefs"],
  summary: "Delete brief",
  operationId: "deleteBrief",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Brief deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

briefRouter.openapi(listBriefsRoute, async (c) => {
  const parser = getParser(c);
  const briefs = await parser.readBriefs();
  return c.json(briefs, 200);
});

briefRouter.openapi(createBriefRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const briefs = await parser.readBriefs();
  const newBrief = {
    id: crypto.randomUUID().substring(0, 8),
    title: body.title || "New Brief",
    date: body.date || new Date().toISOString().split("T")[0],
    summary: body.summary || [],
    mission: body.mission || [],
    responsible: body.responsible || [],
    accountable: body.accountable || [],
    consulted: body.consulted || [],
    informed: body.informed || [],
    highLevelBudget: body.highLevelBudget || [],
    highLevelTimeline: body.highLevelTimeline || [],
    culture: body.culture || [],
    changeCapacity: body.changeCapacity || [],
    guidingPrinciples: body.guidingPrinciples || [],
  };
  briefs.push(newBrief);
  await parser.saveBriefs(briefs);
  await cacheWriteThrough(c, "brief");
  return c.json(newBrief, 201);
});

briefRouter.openapi(updateBriefRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const briefs = await parser.readBriefs();
  const index = briefs.findIndex((b) => b.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  briefs[index] = { ...briefs[index], ...body };
  await parser.saveBriefs(briefs);
  await cacheWriteThrough(c, "brief");
  return c.json(briefs[index], 200);
});

briefRouter.openapi(deleteBriefRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const briefs = await parser.readBriefs();
  const filtered = briefs.filter((b) => b.id !== id);
  if (filtered.length === briefs.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveBriefs(filtered);
  cachePurge(c, "brief", id);
  return c.json({ success: true }, 200);
});
