/**
 * Eisenhower Matrix CRUD routes.
 * Pattern: Feature Router with CRUD operations.
 */

import { Hono } from "hono";
import {
  AppVariables,
  errorResponse,
  getParser,
  jsonResponse,
} from "../context.ts";

export const eisenhowerRouter = new Hono<{ Variables: AppVariables }>();

// GET /eisenhower - list all matrices
eisenhowerRouter.get("/", async (c) => {
  const parser = getParser(c);
  const matrices = await parser.readEisenhowerMatrices();
  return jsonResponse(matrices);
});

// POST /eisenhower - create matrix
eisenhowerRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const matrix = await parser.addEisenhowerMatrix({
    title: body.title || "Untitled Matrix",
    date: body.date || new Date().toISOString().split("T")[0],
    urgentImportant: body.urgentImportant || [],
    notUrgentImportant: body.notUrgentImportant || [],
    urgentNotImportant: body.urgentNotImportant || [],
    notUrgentNotImportant: body.notUrgentNotImportant || [],
  });
  return jsonResponse(matrix, 201);
});

// PUT /eisenhower/:id - update matrix
eisenhowerRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const updated = await parser.updateEisenhowerMatrix(id, body);
  if (!updated) return errorResponse("Not found", 404);
  return jsonResponse(updated);
});

// DELETE /eisenhower/:id - delete matrix
eisenhowerRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const success = await parser.deleteEisenhowerMatrix(id);
  if (!success) return errorResponse("Not found", 404);
  return jsonResponse({ success: true });
});
