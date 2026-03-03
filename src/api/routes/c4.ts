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
  const c4Components = await parser.readC4Components();
  return jsonResponse({ components: c4Components });
});

// POST /c4 - save C4 components (bulk replace)
c4Router.post("/", async (c) => {
  const parser = getParser(c);
  const body = await c.req.json();

  try {
    await parser.saveC4Components(body.components || []);
    await cacheWriteThrough(c, "c4_components");
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Failed to save C4 components:", error);
    return errorResponse("Failed to save C4 components", 500);
  }
});
