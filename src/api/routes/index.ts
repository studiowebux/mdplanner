/**
 * API Router - Combines all route modules.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { ProjectManager } from "../../lib/project-manager.ts";
import { AppVariables, isReadOnly } from "./context.ts";

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
import { moscowRouter } from "./features/moscow.ts";
import { meetingsRouter } from "./features/meetings.ts";
import { onboardingRouter } from "./features/onboarding.ts";
import { onboardingTemplatesRouter } from "./features/onboarding-templates.ts";
import { financesRouter } from "./features/finances.ts";
import { journalRouter } from "./features/journal.ts";
import { eisenhowerRouter } from "./features/eisenhower.ts";
import { safeRouter } from "./features/safe.ts";
import { investorsRouter } from "./features/investors.ts";
import { kpisRouter } from "./features/kpis.ts";
import { orgchartRouter } from "./features/orgchart.ts";
import { peopleRouter } from "./features/people.ts";
import { portfolioRouter } from "./portfolio.ts";

// Export/Import routes
import { exportImportRouter } from "./export-import.ts";

// Search/Cache routes
import { searchRouter } from "./search.ts";

// Uploads routes
import { uploadsRouter } from "./uploads.ts";

// Backup routes
import { backupRouter } from "./backup.ts";

// TTS proxy routes
import { ttsRouter } from "./tts.ts";

export function createApiRouter(
  projectManager: ProjectManager,
): Hono<{ Variables: AppVariables }> {
  const api = new Hono<{ Variables: AppVariables }>();

  // CORS middleware
  api.use("/*", cors());

  // Inject projectManager into context
  api.use("/*", async (c, next) => {
    c.set("projectManager", projectManager);
    await next();
  });

  // Read-only guard: block all mutations when --read-only is active
  api.use("/*", async (c, next) => {
    const mutatingMethods = ["POST", "PUT", "DELETE", "PATCH"];
    if (isReadOnly(c) && mutatingMethods.includes(c.req.method)) {
      return c.json(
        { error: "READ_ONLY_MODE", message: "Server is in read-only mode" },
        405,
      );
    }
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

  // Meetings routes
  api.route("/meetings", meetingsRouter);

  // Onboarding routes
  api.route("/onboarding", onboardingRouter);
  api.route("/onboarding-templates", onboardingTemplatesRouter);

  // Finances routes
  api.route("/finances", financesRouter);

  // Journal routes
  api.route("/journal", journalRouter);

  // MoSCoW Analysis routes
  api.route("/moscow", moscowRouter);

  // Eisenhower Matrix routes
  api.route("/eisenhower", eisenhowerRouter);

  // Fundraising routes
  api.route("/safe", safeRouter);
  api.route("/investors", investorsRouter);
  api.route("/kpis", kpisRouter);

  // People Registry routes
  api.route("/people", peopleRouter);

  // Org Chart routes
  api.route("/orgchart", orgchartRouter);

  // Portfolio routes
  api.route("/portfolio", portfolioRouter);

  // Export/Import routes
  api.route("/", exportImportRouter);

  // Search/Cache routes
  api.route("/search", searchRouter);

  // Uploads routes
  api.route("/uploads", uploadsRouter);

  // Backup routes
  api.route("/backup", backupRouter);

  // TTS proxy routes (avoids browser CORS on cross-origin TTS services)
  api.route("/tts", ttsRouter);

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
