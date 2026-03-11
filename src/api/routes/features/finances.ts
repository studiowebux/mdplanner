/**
 * Financial Period CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const financesRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z
  .object({ error: z.string(), message: z.string().optional() })
  .openapi("FinanceError");
const SuccessSchema = z
  .object({ success: z.boolean() })
  .openapi("FinanceSuccess");
const SuccessWithIdSchema = z
  .object({ success: z.boolean(), id: z.string() })
  .openapi("FinanceSuccessWithId");
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const FinancePeriodItemSchema = z
  .object({
    category: z.string(),
    amount: z.number(),
  })
  .openapi("FinancePeriodItem");

const FinancialPeriodSchema = z
  .object({
    id: z.string(),
    period: z.string().openapi({ description: "Reporting period (YYYY-MM)" }),
    cash_on_hand: z.number(),
    revenue: z.array(FinancePeriodItemSchema),
    expenses: z.array(FinancePeriodItemSchema),
    notes: z.string().optional(),
    created: z.string(),
  })
  .openapi("FinancialPeriod");

const CreateFinancialPeriodSchema = z
  .object({
    period: z.string().optional().openapi({
      description: "Reporting period (YYYY-MM)",
    }),
    cash_on_hand: z.number().optional(),
    revenue: z.array(FinancePeriodItemSchema).optional(),
    expenses: z.array(FinancePeriodItemSchema).optional(),
    notes: z.string().optional(),
  })
  .openapi("CreateFinancialPeriod");

const UpdateFinancialPeriodSchema = CreateFinancialPeriodSchema.openapi(
  "UpdateFinancialPeriod",
);

const listFinancesRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Finances"],
  summary: "List all financial periods",
  operationId: "listFinances",
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(FinancialPeriodSchema) },
      },
      description: "List of financial periods",
    },
  },
});

const getFinanceRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Finances"],
  summary: "Get a single financial period",
  operationId: "getFinance",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: FinancialPeriodSchema } },
      description: "Financial period",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const createFinanceRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Finances"],
  summary: "Create financial period",
  operationId: "createFinance",
  request: {
    body: {
      content: { "application/json": { schema: CreateFinancialPeriodSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: SuccessWithIdSchema } },
      description: "Financial period created",
    },
  },
});

const updateFinanceRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Finances"],
  summary: "Update financial period",
  operationId: "updateFinance",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: UpdateFinancialPeriodSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Financial period updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteFinanceRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Finances"],
  summary: "Delete financial period",
  operationId: "deleteFinance",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Financial period deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

financesRouter.openapi(listFinancesRoute, async (c) => {
  const parser = getParser(c);
  const periods = await parser.readFinancialPeriods();
  return c.json(periods, 200);
});

financesRouter.openapi(getFinanceRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const periods = await parser.readFinancialPeriods();
  const period = periods.find((p) => p.id === id);
  if (!period) return c.json({ error: "Not found" }, 404);
  return c.json(period, 200);
});

financesRouter.openapi(createFinanceRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const record = await parser.addFinancialPeriod({
    period: body.period || "",
    cash_on_hand: Number(body.cash_on_hand) || 0,
    revenue: body.revenue ?? [],
    expenses: body.expenses ?? [],
    notes: body.notes,
  });
  await cacheWriteThrough(c, "financial_periods");
  return c.json({ success: true, id: record.id }, 201);
});

financesRouter.openapi(updateFinanceRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  // Only merge fields explicitly provided to avoid clobbering existing values.
  const updates: Record<string, unknown> = {};
  if (body.period !== undefined) updates.period = body.period;
  if (body.cash_on_hand !== undefined) {
    updates.cash_on_hand = Number(body.cash_on_hand) || 0;
  }
  if (body.revenue !== undefined) updates.revenue = body.revenue;
  if (body.expenses !== undefined) updates.expenses = body.expenses;
  if (body.notes !== undefined) updates.notes = body.notes;
  const updated = await parser.updateFinancialPeriod(id, updates);
  if (!updated) return c.json({ error: "Not found" }, 404);
  await cacheWriteThrough(c, "financial_periods");
  return c.json({ success: true }, 200);
});

financesRouter.openapi(deleteFinanceRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const deleted = await parser.deleteFinancialPeriod(id);
  if (!deleted) return c.json({ error: "Not found" }, 404);
  cachePurge(c, "financial_periods", id);
  return c.json({ success: true }, 200);
});
