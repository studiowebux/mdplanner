/**
 * SAFE Agreement CRUD routes.
 * Pattern: Feature Router with CRUD operations.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const safeRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

const listSafeRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Safe"],
  summary: "List all SAFE agreements",
  operationId: "listSafeAgreements",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.any()) } },
      description: "List of SAFE agreements",
    },
  },
});

const createSafeRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Safe"],
  summary: "Create SAFE agreement",
  operationId: "createSafeAgreement",
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
      description: "SAFE agreement created",
    },
  },
});

const updateSafeRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Safe"],
  summary: "Update SAFE agreement",
  operationId: "updateSafeAgreement",
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
      description: "SAFE agreement updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteSafeRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Safe"],
  summary: "Delete SAFE agreement",
  operationId: "deleteSafeAgreement",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "SAFE agreement deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

safeRouter.openapi(listSafeRoute, async (c) => {
  const parser = getParser(c);
  const agreements = await parser.readSafeAgreements();
  return c.json(agreements, 200);
});

safeRouter.openapi(createSafeRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const agreement = await parser.addSafeAgreement({
    investor: body.investor || "",
    amount: Number(body.amount) || 0,
    valuation_cap: Number(body.valuation_cap) || 0,
    discount: Number(body.discount) || 0,
    type: body.type || "post-money",
    date: body.date || new Date().toISOString().split("T")[0],
    status: body.status || "draft",
    notes: body.notes || "",
  });
  await cacheWriteThrough(c, "safe_agreements");
  return c.json(agreement, 201);
});

safeRouter.openapi(updateSafeRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const updated = await parser.updateSafeAgreement(id, body);
  if (!updated) return c.json({ error: "Not found" }, 404);
  await cacheWriteThrough(c, "safe_agreements");
  return c.json(updated, 200);
});

safeRouter.openapi(deleteSafeRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const success = await parser.deleteSafeAgreement(id);
  if (!success) return c.json({ error: "Not found" }, 404);
  cachePurge(c, "safe_agreements", id);
  return c.json({ success: true }, 200);
});
