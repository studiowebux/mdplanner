/**
 * Investor Pipeline CRUD routes.
 * Pattern: Feature Router with CRUD operations.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cacheWriteThrough,
  cachePurge,
  errorResponse,
  getParser,
  jsonResponse,
} from "../context.ts";

export const investorsRouter = new Hono<{ Variables: AppVariables }>();

// GET /investors - list all investors
investorsRouter.get("/", async (c) => {
  const parser = getParser(c);
  const investors = await parser.readInvestors();
  return jsonResponse(investors);
});

// POST /investors - create investor
investorsRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
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
  return jsonResponse(investor, 201);
});

// PUT /investors/:id - update investor
investorsRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await parser.updateInvestor(id, body);
  if (!updated) return errorResponse("Not found", 404);
  await cacheWriteThrough(c, "investors");
  return jsonResponse(updated);
});

// DELETE /investors/:id - delete investor
investorsRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const success = await parser.deleteInvestor(id);
  if (!success) return errorResponse("Not found", 404);
  cachePurge(c, "investors", id);
  return jsonResponse({ success: true });
});
