/**
 * C4 Architecture routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cacheWriteThrough,
  getParser,
} from "./context.ts";

export const c4Router = new OpenAPIHono<{ Variables: AppVariables }>();

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});
const SuccessSchema = z.object({ success: z.boolean() });

// --- Route definitions ---

const listC4Route = createRoute({
  method: "get",
  path: "/",
  tags: ["C4 Architecture"],
  summary: "Get all C4 components",
  operationId: "listC4Components",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "C4 components",
    },
  },
});

const saveC4Route = createRoute({
  method: "post",
  path: "/",
  tags: ["C4 Architecture"],
  summary: "Save C4 components (bulk replace)",
  operationId: "saveC4Components",
  request: {
    body: {
      content: {
        "application/json": { schema: z.any() },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Components saved",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Save failed",
    },
  },
});

// --- Handlers ---

c4Router.openapi(listC4Route, async (c) => {
  const parser = getParser(c);
  const c4Components = await parser.readC4Components();
  return c.json({ components: c4Components }, 200);
});

c4Router.openapi(saveC4Route, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  try {
    await parser.saveC4Components(body.components || []);
    await cacheWriteThrough(c, "c4_components");
    return c.json({ success: true }, 200);
  } catch (error) {
    console.error("Failed to save C4 components:", error);
    return c.json({ error: "Failed to save C4 components" }, 500);
  }
});
