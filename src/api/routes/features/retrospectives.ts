/**
 * Retrospectives CRUD routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  errorResponse,
  getParser,
  jsonResponse,
} from "../context.ts";

export const retrospectivesRouter = new Hono<{ Variables: AppVariables }>();

// GET /retrospectives - list all retrospectives
retrospectivesRouter.get("/", async (c) => {
  const parser = getParser(c);
  const retrospectives = await parser.readRetrospectives();
  return jsonResponse(retrospectives);
});

// POST /retrospectives - create retrospective
retrospectivesRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const retrospectives = await parser.readRetrospectives();
  const id = crypto.randomUUID().substring(0, 8);
  retrospectives.push({
    id,
    title: body.title,
    date: body.date || new Date().toISOString().split("T")[0],
    status: body.status || "open",
    continue: body.continue || [],
    stop: body.stop || [],
    start: body.start || [],
  });
  await parser.saveRetrospectives(retrospectives);
  return jsonResponse({ success: true, id }, 201);
});

// PUT /retrospectives/:id - update retrospective
retrospectivesRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const retrospectives = await parser.readRetrospectives();
  const index = retrospectives.findIndex((r) => r.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  retrospectives[index] = { ...retrospectives[index], ...body };
  await parser.saveRetrospectives(retrospectives);
  return jsonResponse({ success: true });
});

// DELETE /retrospectives/:id - delete retrospective
retrospectivesRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const retrospectives = await parser.readRetrospectives();
  const filtered = retrospectives.filter((r) => r.id !== id);
  if (filtered.length === retrospectives.length) {
    return errorResponse("Not found", 404);
  }
  await parser.saveRetrospectives(filtered);
  return jsonResponse({ success: true });
});
