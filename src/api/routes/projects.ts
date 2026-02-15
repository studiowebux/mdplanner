/**
 * Project management routes.
 */

import { Hono } from "hono";
import { AppVariables, getProjectManager, jsonResponse, errorResponse } from "./context.ts";
import { VERSION, GITHUB_REPO } from "../../../main.ts";

export const projectsRouter = new Hono<{ Variables: AppVariables }>();

// GET /projects - list all projects
projectsRouter.get("/", async (c) => {
  const pm = getProjectManager(c);
  const projects = await pm.scanProjects();
  return jsonResponse(projects);
});

// GET /projects/active - get active project
projectsRouter.get("/active", async (c) => {
  const pm = getProjectManager(c);
  const activeFile = pm.getActiveFile();
  const projects = await pm.scanProjects();
  const active = projects.find(p => p.filename === activeFile);
  return jsonResponse({ filename: activeFile, project: active });
});

// POST /projects/switch - switch to a different project
projectsRouter.post("/switch", async (c) => {
  const pm = getProjectManager(c);
  const body = await c.req.json();
  const success = await pm.switchProject(body.filename);
  if (success) {
    return jsonResponse({ success: true, filename: body.filename });
  }
  return errorResponse("Project not found", 404);
});

// POST /projects/create - create new project
projectsRouter.post("/create", async (c) => {
  const pm = getProjectManager(c);
  const body = await c.req.json();
  const filename = await pm.createProject(body.name);
  return jsonResponse({ success: true, filename }, 201);
});
