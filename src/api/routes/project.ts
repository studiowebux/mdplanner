/**
 * Project info, config, and sections routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cacheWriteThrough,
  errorResponse,
  getParser,
  jsonResponse,
} from "./context.ts";

export const projectRouter = new Hono<{ Variables: AppVariables }>();

// GET /project - get project info
projectRouter.get("/", async (c) => {
  const parser = getParser(c);
  const projectInfo = await parser.readProjectInfo();
  return jsonResponse(projectInfo);
});

// GET /project/config - get project config
projectRouter.get("/config", async (c) => {
  const parser = getParser(c);
  const config = await parser.readProjectConfig();
  return jsonResponse(config);
});

// GET /project/sections - get board sections
projectRouter.get("/sections", async (c) => {
  const parser = getParser(c);
  const sections = parser.getSectionsFromBoard();
  return jsonResponse(sections);
});

// PUT /project/info - update project name and/or description
projectRouter.put("/info", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  try {
    if (typeof body.name === "string" && body.name.trim()) {
      await parser.saveProjectName(body.name.trim());
    }
    if (Array.isArray(body.description)) {
      await parser.saveProjectDescription(body.description);
    }
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Failed to save project info:", error);
    return errorResponse("Failed to save project info", 500);
  }
});

// POST /project/config - save project config
projectRouter.post("/config", async (c) => {
  const parser = getParser(c);
  const config = await c.req.json();
  try {
    // Strip null/malformed link entries before saving
    if (Array.isArray(config.links)) {
      config.links = config.links.filter(
        (l: unknown) =>
          l != null &&
          typeof (l as Record<string, unknown>).url === "string" &&
          typeof (l as Record<string, unknown>).title === "string",
      );
    }
    await parser.saveProjectConfig(config);
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Failed to save config:", error);
    return errorResponse("Failed to save config", 500);
  }
});

// POST /project/rewrite - rewrite tasks with sections
projectRouter.post("/rewrite", async (c) => {
  const parser = getParser(c);
  console.log("Rewrite endpoint called");
  const body = await c.req.json();
  const tasks = await parser.readTasks();
  console.log("Current tasks count:", tasks.length);
  await parser.writeTasks(tasks, body.sections);
  console.log("Tasks rewritten with sections:", body.sections);
  await cacheWriteThrough(c, "tasks");
  return jsonResponse({ success: true });
});
