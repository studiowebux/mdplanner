/**
 * SAFE Agreement CRUD routes.
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

export const safeRouter = new Hono<{ Variables: AppVariables }>();

// GET /safe - list all SAFE agreements
safeRouter.get("/", async (c) => {
  const parser = getParser(c);
  const agreements = await parser.readSafeAgreements();
  return jsonResponse(agreements);
});

// POST /safe - create agreement
safeRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
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
  return jsonResponse(agreement, 201);
});

// PUT /safe/:id - update agreement
safeRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await parser.updateSafeAgreement(id, body);
  if (!updated) return errorResponse("Not found", 404);
  await cacheWriteThrough(c, "safe_agreements");
  return jsonResponse(updated);
});

// DELETE /safe/:id - delete agreement
safeRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const success = await parser.deleteSafeAgreement(id);
  if (!success) return errorResponse("Not found", 404);
  cachePurge(c, "safe_agreements", id);
  return jsonResponse({ success: true });
});
