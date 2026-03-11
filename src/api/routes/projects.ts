/**
 * Project routes - simplified for single-project mode.
 */

import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { AppVariables, getProjectManager } from "./context.ts";

const ErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

export const projectsRouter = new OpenAPIHono<{ Variables: AppVariables }>();

// GET /projects - returns the active project (kept for compatibility)
const listProjectsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Projects"],
  summary: "List all projects (single-project mode returns the active project)",
  operationId: "listProjects",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(z.any()),
        },
      },
      description: "List of scanned projects",
    },
  },
});

projectsRouter.openapi(listProjectsRoute, async (c) => {
  const pm = getProjectManager(c);
  const projects = await pm.scanProjects();
  return c.json(projects, 200);
});

// GET /projects/active - get active project info
const activeProjectRoute = createRoute({
  method: "get",
  path: "/active",
  tags: ["Projects"],
  summary: "Get the active project with filename and name",
  operationId: "getActiveProject",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.any().openapi({
            description: "Active project with filename and metadata",
          }),
        },
      },
      description: "Active project info",
    },
  },
});

projectsRouter.openapi(activeProjectRoute, async (c) => {
  const pm = getProjectManager(c);
  const projects = await pm.scanProjects();
  const active = projects[0] ?? null;
  return c.json({
    filename: pm.getActiveFile(),
    name: active?.name || pm.getActiveFile(),
    project: active,
  }, 200);
});

// GET /projects/validate - validate project directory structure
const validateProjectRoute = createRoute({
  method: "get",
  path: "/validate",
  tags: ["Projects"],
  summary: "Validate project directory structure",
  operationId: "validateProject",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            valid: z.boolean(),
            errors: z.array(z.object({
              type: z.string(),
              path: z.string(),
              message: z.string(),
            })).optional(),
            warnings: z.array(z.object({
              type: z.string(),
              path: z.string(),
              message: z.string(),
            })).optional(),
          }),
        },
      },
      description: "Validation result",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "No active project directory",
    },
  },
});

projectsRouter.openapi(validateProjectRoute, async (c) => {
  const pm = getProjectManager(c);

  const { validateProjectDirectory } = await import(
    "../../lib/parser/directory/validate.ts"
  );
  const projectDir = pm.getActiveProjectDir();

  if (!projectDir) {
    return c.json({ error: "No active project directory" }, 400);
  }

  const result = await validateProjectDirectory(projectDir);
  return c.json(result, 200);
});
