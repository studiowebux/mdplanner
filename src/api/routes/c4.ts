/**
 * C4 Architecture routes.
 */

import { Hono } from "hono";
import {
  AppVariables,
  cacheWriteThrough,
  errorResponse,
  getParser,
  jsonResponse,
} from "./context.ts";

export const c4Router = new Hono<{ Variables: AppVariables }>();

// GET /c4 - get all C4 components
c4Router.get("/", async (c) => {
  const parser = getParser(c);
  const projectInfo = await parser.readProjectInfo();
  const c4Components = projectInfo.c4Components || [];
  return jsonResponse({ components: c4Components });
});

// POST /c4 - save C4 components
c4Router.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();
  const projectInfo = await parser.readProjectInfo();
  projectInfo.c4Components = body.components || [];

  try {
    await parser.saveProjectInfo(projectInfo);
    await cacheWriteThrough(c, "c4_components");
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Failed to save C4 components:", error);
    return errorResponse("Failed to save C4 components", 500);
  }
});
