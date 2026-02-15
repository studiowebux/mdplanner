/**
 * Project routes - simplified for single-project mode.
 */

import { Hono } from "hono";
import { AppVariables, getProjectManager, jsonResponse, errorResponse } from "./context.ts";
import { VERSION, GITHUB_REPO } from "../../../main.ts";

export const projectsRouter = new Hono<{ Variables: AppVariables }>();

// GET /projects - returns the active project (kept for compatibility)
projectsRouter.get("/", async (c) => {
  const pm = getProjectManager(c);
  const projects = await pm.scanProjects();
  return jsonResponse(projects);
});

// GET /projects/active - get active project info
projectsRouter.get("/active", async (c) => {
  const pm = getProjectManager(c);
  const projects = await pm.scanProjects();
  const active = projects[0];
  return jsonResponse({
    filename: pm.getActiveFile(),
    name: active?.name || pm.getActiveFile(),
    project: active
  });
});

// GET /projects/validate - validate project directory structure
projectsRouter.get("/validate", async (c) => {
  const pm = getProjectManager(c);

  const { validateProjectDirectory } = await import("../../lib/parser/directory/validate.ts");
  const projectDir = pm.getActiveProjectDir();

  if (!projectDir) {
    return errorResponse("No active project directory", 400);
  }

  const result = await validateProjectDirectory(projectDir);
  return jsonResponse(result);
});
