/**
 * Project Value Board CRUD routes.
 */

import { Hono } from "hono";
import { AppVariables, getParser, jsonResponse, errorResponse } from "../context.ts";

export const projectValueRouter = new Hono<{ Variables: AppVariables }>();

// GET /project-value-board - list all project value boards
projectValueRouter.get("/", async (c) => {
  const parser = getParser(c);
  const boards = await parser.readProjectValueBoards();
  return jsonResponse(boards);
});

// POST /project-value-board - create project value board
projectValueRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const boards = await parser.readProjectValueBoards();
  const newBoard = {
    id: crypto.randomUUID(),
    title: body.title || "New Board",
    date: body.date || new Date().toISOString().split("T")[0],
    customerSegments: body.customerSegments || [],
    problem: body.problem || [],
    solution: body.solution || [],
    benefit: body.benefit || [],
  };
  boards.push(newBoard);
  await parser.saveProjectValueBoards(boards);
  return jsonResponse(newBoard, 201);
});

// PUT /project-value-board/:id - update project value board
projectValueRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const boards = await parser.readProjectValueBoards();
  const index = boards.findIndex(b => b.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  boards[index] = { ...boards[index], ...body };
  await parser.saveProjectValueBoards(boards);
  return jsonResponse(boards[index]);
});

// DELETE /project-value-board/:id - delete project value board
projectValueRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const boards = await parser.readProjectValueBoards();
  const filtered = boards.filter(b => b.id !== id);
  if (filtered.length === boards.length) return errorResponse("Not found", 404);
  await parser.saveProjectValueBoards(filtered);
  return jsonResponse({ success: true });
});
