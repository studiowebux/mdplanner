/**
 * Risk Analysis CRUD routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  getParser,
} from "../context.ts";

export const riskRouter = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z
  .object({ error: z.string(), message: z.string().optional() })
  .openapi("RiskError");
const SuccessSchema = z
  .object({ success: z.boolean() })
  .openapi("RiskSuccess");
const idParam = z.object({
  id: z.string().openapi({ param: { name: "id", in: "path" } }),
});

const stringArray = z.array(z.string());

const RiskSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    date: z.string(),
    highImpactHighProb: stringArray,
    highImpactLowProb: stringArray,
    lowImpactHighProb: stringArray,
    lowImpactLowProb: stringArray,
  })
  .openapi("Risk");

const CreateRiskSchema = z
  .object({
    title: z.string().optional().openapi({ description: "Analysis title" }),
    date: z.string().optional().openapi({ description: "Date (YYYY-MM-DD)" }),
    highImpactHighProb: stringArray.optional(),
    highImpactLowProb: stringArray.optional(),
    lowImpactHighProb: stringArray.optional(),
    lowImpactLowProb: stringArray.optional(),
  })
  .openapi("CreateRisk");

const UpdateRiskSchema = CreateRiskSchema.openapi("UpdateRisk");

const listRiskRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Risk"],
  summary: "List all risk analyses",
  operationId: "listRiskAnalyses",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(RiskSchema) } },
      description: "List of risk analyses",
    },
  },
});

const createRiskRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Risk"],
  summary: "Create risk analysis",
  operationId: "createRiskAnalysis",
  request: {
    body: {
      content: { "application/json": { schema: CreateRiskSchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: RiskSchema } },
      description: "Risk analysis created",
    },
  },
});

const updateRiskRoute = createRoute({
  method: "put",
  path: "/{id}",
  tags: ["Risk"],
  summary: "Update risk analysis",
  operationId: "updateRiskAnalysis",
  request: {
    params: idParam,
    body: {
      content: { "application/json": { schema: UpdateRiskSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Risk analysis updated",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

const deleteRiskRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Risk"],
  summary: "Delete risk analysis",
  operationId: "deleteRiskAnalysis",
  request: { params: idParam },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Risk analysis deleted",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not found",
    },
  },
});

// --- Handlers ---

riskRouter.openapi(listRiskRoute, async (c) => {
  const parser = getParser(c);
  const riskAnalyses = await parser.readRiskAnalyses();
  return c.json(riskAnalyses, 200);
});

riskRouter.openapi(createRiskRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const riskAnalyses = await parser.readRiskAnalyses();
  const newRisk = {
    id: crypto.randomUUID().substring(0, 8),
    title: body.title || "",
    date: body.date || new Date().toISOString().split("T")[0],
    highImpactHighProb: body.highImpactHighProb || [],
    highImpactLowProb: body.highImpactLowProb || [],
    lowImpactHighProb: body.lowImpactHighProb || [],
    lowImpactLowProb: body.lowImpactLowProb || [],
  };
  riskAnalyses.push(newRisk);
  await parser.saveRiskAnalyses(riskAnalyses);
  await cacheWriteThrough(c, "risk");
  return c.json(newRisk, 201);
});

riskRouter.openapi(updateRiskRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const riskAnalyses = await parser.readRiskAnalyses();
  const index = riskAnalyses.findIndex((r) => r.id === id);
  if (index === -1) return c.json({ error: "Not found" }, 404);
  riskAnalyses[index] = { ...riskAnalyses[index], ...body };
  await parser.saveRiskAnalyses(riskAnalyses);
  await cacheWriteThrough(c, "risk");
  return c.json({ success: true }, 200);
});

riskRouter.openapi(deleteRiskRoute, async (c) => {
  const parser = getParser(c);
  const { id } = c.req.valid("param");
  const riskAnalyses = await parser.readRiskAnalyses();
  const filtered = riskAnalyses.filter((r) => r.id !== id);
  if (filtered.length === riskAnalyses.length) {
    return c.json({ error: "Not found" }, 404);
  }
  await parser.saveRiskAnalyses(filtered);
  cachePurge(c, "risk", id);
  return c.json({ success: true }, 200);
});
