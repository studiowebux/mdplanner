/**
 * Employee Onboarding CRUD routes.
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

export const onboardingRouter = new Hono<{ Variables: AppVariables }>();

// GET /onboarding - list all records sorted by startDate desc
onboardingRouter.get("/", async (c) => {
  const parser = getParser(c);
  const records = await parser.readOnboardingRecords();
  return jsonResponse(records);
});

// GET /onboarding/:id - single record
onboardingRouter.get("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const records = await parser.readOnboardingRecords();
  const record = records.find((r) => r.id === id);
  if (!record) return errorResponse("Not found", 404);
  return jsonResponse(record);
});

// POST /onboarding - create record
onboardingRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const record = await parser.addOnboardingRecord({
    employeeName: body.employeeName || "New Employee",
    role: body.role || "",
    startDate: body.startDate || new Date().toISOString().split("T")[0],
    personId: body.personId,
    steps: body.steps ?? [],
    notes: body.notes,
  });
  await cacheWriteThrough(c, "onboarding");
  return jsonResponse({ success: true, id: record.id }, 201);
});

// PUT /onboarding/:id - update record
onboardingRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  // Only include fields that were explicitly provided to avoid clobbering
  // existing values with undefined when a partial update is sent.
  const updates: Record<string, unknown> = {};
  if (body.employeeName !== undefined) updates.employeeName = body.employeeName;
  if (body.role !== undefined) updates.role = body.role;
  if (body.startDate !== undefined) updates.startDate = body.startDate;
  if (body.personId !== undefined) updates.personId = body.personId;
  if (body.steps !== undefined) updates.steps = body.steps;
  if (body.notes !== undefined) updates.notes = body.notes;
  const updated = await parser.updateOnboardingRecord(id, updates);
  if (!updated) return errorResponse("Not found", 404);
  await cacheWriteThrough(c, "onboarding");
  return jsonResponse({ success: true });
});

// DELETE /onboarding/:id - delete record
onboardingRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const deleted = await parser.deleteOnboardingRecord(id);
  if (!deleted) return errorResponse("Not found", 404);
  cachePurge(c, "onboarding", id);
  return jsonResponse({ success: true });
});
