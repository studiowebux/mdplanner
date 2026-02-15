/**
 * API Router - Combines all route modules.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { ProjectManager } from "../../lib/project-manager.ts";
import { AppVariables } from "./context.ts";

// Core routes
import { versionRouter } from "./version.ts";
import { projectsRouter } from "./projects.ts";
import { projectRouter } from "./project.ts";
import { tasksRouter } from "./tasks.ts";
import { notesRouter } from "./notes.ts";
import { goalsRouter } from "./goals.ts";

// Canvas routes
import { canvasRouter } from "./canvas.ts";
import { mindmapsRouter } from "./mindmaps.ts";
import { c4Router } from "./c4.ts";

// Feature routes
import { milestonesRouter } from "./features/milestones.ts";
import { ideasRouter } from "./features/ideas.ts";
import { retrospectivesRouter } from "./features/retrospectives.ts";
import { swotRouter } from "./features/swot.ts";
import { riskRouter } from "./features/risk.ts";
import { leanCanvasRouter } from "./features/lean-canvas.ts";
import { businessModelRouter } from "./features/business-model.ts";
import { projectValueRouter } from "./features/project-value.ts";
import { briefRouter } from "./features/brief.ts";
import { timeTrackingRouter } from "./features/time-tracking.ts";
import { capacityRouter } from "./features/capacity.ts";
import { strategicRouter } from "./features/strategic.ts";
import { billingRouter } from "./features/billing.ts";
import { crmRouter } from "./features/crm.ts";

// Export/Import routes
import { exportImportRouter } from "./export-import.ts";

export function createApiRouter(projectManager: ProjectManager): Hono<{ Variables: AppVariables }> {
  const api = new Hono<{ Variables: AppVariables }>();

  // CORS middleware
  api.use("/*", cors());

  // Inject projectManager into context
  api.use("/*", async (c, next) => {
    c.set("projectManager", projectManager);
    await next();
  });

  // Core routes
  api.route("/version", versionRouter);
  api.route("/projects", projectsRouter);
  api.route("/project", projectRouter);
  api.route("/tasks", tasksRouter);
  api.route("/notes", notesRouter);
  api.route("/goals", goalsRouter);

  // Canvas routes
  api.route("/canvas", canvasRouter);
  api.route("/mindmaps", mindmapsRouter);
  api.route("/c4", c4Router);

  // Feature routes
  api.route("/milestones", milestonesRouter);
  api.route("/ideas", ideasRouter);
  api.route("/retrospectives", retrospectivesRouter);
  api.route("/swot", swotRouter);
  api.route("/risk-analysis", riskRouter);
  api.route("/lean-canvas", leanCanvasRouter);
  api.route("/business-model", businessModelRouter);
  api.route("/project-value-board", projectValueRouter);
  api.route("/brief", briefRouter);
  api.route("/time-entries", timeTrackingRouter);
  api.route("/capacity", capacityRouter);
  api.route("/strategic-levels", strategicRouter);

  // Billing routes (nested under various paths)
  api.route("/", billingRouter);

  // CRM routes (nested under various paths)
  api.route("/", crmRouter);

  // Export/Import routes
  api.route("/", exportImportRouter);

  // 404 handler
  api.notFound((c) => {
    return c.json({ error: "Not found" }, 404);
  });

  // Error handler
  api.onError((err, c) => {
    console.error("API Error:", err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return api;
}
