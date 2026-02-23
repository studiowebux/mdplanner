/**
 * Ideas CRUD routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cachePurge,
  cacheWriteThrough,
  errorResponse,
  getParser,
  jsonResponse,
} from "../context.ts";

export const ideasRouter = new Hono<{ Variables: AppVariables }>();

// GET /ideas - list all ideas with backlinks
ideasRouter.get("/", async (c) => {
  const parser = getParser(c);
  const ideas = await parser.readIdeasWithBacklinks();
  return jsonResponse(ideas);
});

// POST /ideas - create idea
ideasRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const ideas = await parser.readIdeas();
  const id = crypto.randomUUID().substring(0, 8);
  ideas.push({
    id,
    title: body.title,
    status: body.status || "new",
    category: body.category,
    created: new Date().toISOString().split("T")[0],
    description: body.description,
  });
  await parser.saveIdeas(ideas);
  await cacheWriteThrough(c, "ideas");
  return jsonResponse({ success: true, id }, 201);
});

// PUT /ideas/:id - update idea
ideasRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const ideas = await parser.readIdeas();
  const index = ideas.findIndex((i) => i.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  ideas[index] = { ...ideas[index], ...body };
  await parser.saveIdeas(ideas);
  await cacheWriteThrough(c, "ideas");
  return jsonResponse({ success: true });
});

// DELETE /ideas/:id - delete idea
ideasRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const ideas = await parser.readIdeas();
  const filtered = ideas.filter((i) => i.id !== id);
  if (filtered.length === ideas.length) return errorResponse("Not found", 404);
  await parser.saveIdeas(filtered);
  cachePurge(c, "ideas", id);
  return jsonResponse({ success: true });
});
