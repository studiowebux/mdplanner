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

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});
const SuccessSchema = z.object({ success: z.boolean() });

const SAFEAgreementSchema = z
  .object({
    id: z.string(),
    investor: z.string(),
    amount: z.number(),
    valuation_cap: z.number(),
    discount: z.number(),
    type: z.enum(["pre-money", "post-money", "mfn"]),
    date: z.string(),
    status: z.enum(["draft", "signed", "converted"]),
    notes: z.string(),
  })
  .openapi("SAFEAgreement");

const CreateSAFEAgreementSchema = z
  .object({
    investor: z.string().optional().openapi({ description: "Investor name" }),
    amount: z.number().optional().openapi({ description: "Investment amount" }),
    valuation_cap: z.number().optional().openapi({
      description: "Valuation cap",
    }),
    discount: z.number().optional().openapi({
      description: "Discount rate (0-100)",
    }),
    type: z.enum(["pre-money", "post-money", "mfn"]).optional().openapi({
      description: "SAFE type",
    }),
    date: z.string().optional().openapi({ description: "Agreement date" }),
    status: z.enum(["draft", "signed", "converted"]).optional().openapi({
      description: "Agreement status",
    }),
    notes: z.string().optional().openapi({ description: "Notes" }),
  })
  .openapi("CreateSAFEAgreement");

const UpdateSAFEAgreementSchema = z
  .object({
    investor: z.string().optional(),
    amount: z.number().optional(),
    valuation_cap: z.number().optional(),
    discount: z.number().optional(),
    type: z.enum(["pre-money", "post-money", "mfn"]).optional(),
    date: z.string().optional(),
    status: z.enum(["draft", "signed", "converted"]).optional(),
    notes: z.string().optional(),
  })
  .openapi("UpdateSAFEAgreement");

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

const listSafeRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Safe"],
  summary: "List all SAFE agreements",
  operationId: "listSafeAgreements",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(SAFEAgreementSchema) },
      },
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
        "application/json": { schema: CreateSAFEAgreementSchema },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SAFEAgreementSchema } },
      description: "SAFE agreement created",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid input",
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
        "application/json": { schema: UpdateSAFEAgreementSchema },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SAFEAgreementSchema } },
      description: "SAFE agreement updated",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid input",
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
