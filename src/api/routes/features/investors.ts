/**
 * Investor Pipeline CRUD routes.
 * Pattern: Feature Router with CRUD operations.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const investorsRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z
  .object({ error: z.string(), message: z.string().optional() })
  .openapi("InvestorError");
const SuccessSchema = z
  .object({ success: z.boolean() })
  .openapi("InvestorSuccess");
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const investorType = z.enum([
  "vc",
  "angel",
  "family_office",
  "corporate",
  "accelerator",
]);
const investorStage = z.enum(["lead", "associate", "partner", "passed"]);
const investorStatus = z.enum([
  "not_started",
  "in_progress",
  "term_sheet",
  "passed",
  "invested",
]);

const InvestorSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: investorType,
    stage: investorStage,
    status: investorStatus,
    amount_target: z.number(),
    contact: z.string(),
    intro_date: z.string(),
    last_contact: z.string(),
    notes: z.string(),
  })
  .openapi("Investor");

const CreateInvestorSchema = z
  .object({
    name: z.string().optional().openapi({ description: "Investor name" }),
    type: investorType.optional(),
    stage: investorStage.optional(),
    status: investorStatus.optional(),
    amount_target: z.number().optional(),
    contact: z.string().optional(),
    intro_date: z.string().optional(),
    last_contact: z.string().optional(),
    notes: z.string().optional(),
  })
  .openapi("CreateInvestor");

const UpdateInvestorSchema = CreateInvestorSchema.openapi("UpdateInvestor");

const listInvestorsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Investors"],
  summary: "List all investors",
  operationId: "listInvestors",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(InvestorSchema) } },
      description: "List of investors",
    },
  },
});

const createInvestorRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Investors"],
  summary: "Create investor",
  operationId: "createInvestor",
  request: {
    body: {
      content: { "application/json": { schema: CreateInvestorSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: InvestorSchema } },
      description: "Investor created",
    },
  },
});

const updateInvestorRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Investors"],
  summary: "Update investor",
  operationId: "updateInvestor",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: UpdateInvestorSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: InvestorSchema } },
      description: "Investor updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteInvestorRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Investors"],
  summary: "Delete investor",
  operationId: "deleteInvestor",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Investor deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

investorsRouter.openapi(listInvestorsRoute, async (c) => {
  const parser = getParser(c);
  const investors = await parser.readInvestors();
  return c.json(investors, 200);
});

investorsRouter.openapi(createInvestorRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const investor = await parser.addInvestor({
    name: body.name || "",
    type: body.type || "vc",
    stage: body.stage || "lead",
    status: body.status || "not_started",
    amount_target: Number(body.amount_target) || 0,
    contact: body.contact || "",
    intro_date: body.intro_date || "",
    last_contact: body.last_contact || "",
    notes: body.notes || "",
  });
  await cacheWriteThrough(c, "investors");
  return c.json(investor, 201);
});

investorsRouter.openapi(updateInvestorRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const updated = await parser.updateInvestor(id, body);
  if (!updated) return c.json({ error: "Not found" }, 404);
  await cacheWriteThrough(c, "investors");
  return c.json(updated, 200);
});

investorsRouter.openapi(deleteInvestorRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const success = await parser.deleteInvestor(id);
  if (!success) return c.json({ error: "Not found" }, 404);
  cachePurge(c, "investors", id);
  return c.json({ success: true }, 200);
});
