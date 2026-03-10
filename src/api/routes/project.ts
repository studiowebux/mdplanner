/**
 * Project info, config, and sections routes.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import {
  AppVariables,
  cacheWriteThrough,
  getParser,
} from "./context.ts";

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

const SuccessSchema = z.object({ success: z.boolean() });

export const projectRouter = new OpenAPIHono<{ Variables: AppVariables }>();

// GET /project - get project info
const getProjectInfoRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Projects"],
  summary: "Get project info (name, description)",
  operationId: "getProjectInfo",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string(),
            description: z.array(z.string()).optional(),
          }),
        },
      },
      description: "Project info",
    },
  },
});

projectRouter.openapi(getProjectInfoRoute, async (c) => {
  const parser = getParser(c);
  const projectInfo = await parser.readProjectInfo();
  return c.json(projectInfo, 200);
});

// GET /project/config - get project config
const getProjectConfigRoute = createRoute({
  method: "get",
  path: "/config",
  tags: ["Projects"],
  summary: "Get project configuration",
  operationId: "getProjectConfig",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.any().openapi({ description: "Project configuration object" }),
        },
      },
      description: "Project configuration object",
    },
  },
});

projectRouter.openapi(getProjectConfigRoute, async (c) => {
  const parser = getParser(c);
  const config = await parser.readProjectConfig();
  return c.json(config, 200);
});

// GET /project/sections - get board sections
const getProjectSectionsRoute = createRoute({
  method: "get",
  path: "/sections",
  tags: ["Projects"],
  summary: "Get board sections",
  operationId: "getProjectSections",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(z.string()),
        },
      },
      description: "List of board section names",
    },
  },
});

projectRouter.openapi(getProjectSectionsRoute, async (c) => {
  const parser = getParser(c);
  const sections = await parser.getSectionsFromBoard();
  return c.json(sections, 200);
});

// PUT /project/info - update project name and/or description
const updateProjectInfoRoute = createRoute({
  method: "put",
  path: "/info",
  tags: ["Projects"],
  summary: "Update project name and/or description",
  operationId: "updateProjectInfo",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            name: z.string().optional(),
            description: z.array(z.string()).optional(),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Project info updated",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Failed to save project info",
    },
  },
});

projectRouter.openapi(updateProjectInfoRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  try {
    if (typeof body.name === "string" && body.name.trim()) {
      await parser.saveProjectName(body.name.trim());
    }
    if (Array.isArray(body.description)) {
      await parser.saveProjectDescription(body.description);
    }
    return c.json({ success: true }, 200);
  } catch (error) {
    console.error("Failed to save project info:", error);
    return c.json({ error: "Failed to save project info" }, 500);
  }
});

// POST /project/config - save project config
const saveProjectConfigRoute = createRoute({
  method: "post",
  path: "/config",
  tags: ["Projects"],
  summary: "Save project configuration",
  operationId: "saveProjectConfig",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.record(z.string(), z.unknown()),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Config saved",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Failed to save config",
    },
  },
});

projectRouter.openapi(saveProjectConfigRoute, async (c) => {
  const parser = getParser(c);
  const config = c.req.valid("json");
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
    return c.json({ success: true }, 200);
  } catch (error) {
    console.error("Failed to save config:", error);
    return c.json({ error: "Failed to save config" }, 500);
  }
});

// POST /project/rewrite - rewrite tasks with sections
const rewriteTasksRoute = createRoute({
  method: "post",
  path: "/rewrite",
  tags: ["Projects"],
  summary: "Rewrite tasks with updated section ordering",
  operationId: "rewriteProjectTasks",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            sections: z.array(z.string()),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: SuccessSchema } },
      description: "Tasks rewritten with new sections",
    },
  },
});

projectRouter.openapi(rewriteTasksRoute, async (c) => {
  const parser = getParser(c);
  const body = c.req.valid("json");
  const tasks = await parser.readTasks();
  await parser.writeTasks(tasks, body.sections);
  await cacheWriteThrough(c, "tasks");
  return c.json({ success: true }, 200);
});
