/**
 * Brief CRUD routes.
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

export const briefRouter = new Hono<{ Variables: AppVariables }>();

// GET /brief - list all briefs
briefRouter.get("/", async (c) => {
  const parser = getParser(c);
  const briefs = await parser.readBriefs();
  return jsonResponse(briefs);
});

// POST /brief - create brief
briefRouter.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const briefs = await parser.readBriefs();
  const newBrief = {
    id: crypto.randomUUID().substring(0, 8),
    title: body.title || "New Brief",
    date: body.date || new Date().toISOString().split("T")[0],
    summary: body.summary || [],
    mission: body.mission || [],
    responsible: body.responsible || [],
    accountable: body.accountable || [],
    consulted: body.consulted || [],
    informed: body.informed || [],
    highLevelBudget: body.highLevelBudget || [],
    highLevelTimeline: body.highLevelTimeline || [],
    culture: body.culture || [],
    changeCapacity: body.changeCapacity || [],
    guidingPrinciples: body.guidingPrinciples || [],
  };
  briefs.push(newBrief);
  await parser.saveBriefs(briefs);
  await cacheWriteThrough(c, "brief");
  return jsonResponse(newBrief, 201);
});

// PUT /brief/:id - update brief
briefRouter.put("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const body = await c.req.json();
  const briefs = await parser.readBriefs();
  const index = briefs.findIndex((b) => b.id === id);
  if (index === -1) return errorResponse("Not found", 404);
  briefs[index] = { ...briefs[index], ...body };
  await parser.saveBriefs(briefs);
  await cacheWriteThrough(c, "brief");
  return jsonResponse(briefs[index]);
});

// DELETE /brief/:id - delete brief
briefRouter.delete("/:id", async (c) => {
  const parser = getParser(c);
  const id = c.req.param("id");
  const briefs = await parser.readBriefs();
  const filtered = briefs.filter((b) => b.id !== id);
  if (filtered.length === briefs.length) return errorResponse("Not found", 404);
  await parser.saveBriefs(filtered);
  cachePurge(c, "brief", id);
  return jsonResponse({ success: true });
});
