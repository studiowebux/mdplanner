/**
 * API Router - Combines all route modules.
 */

import { Hono } from "hono";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { RateLimiter } from "../../lib/rate-limit.ts";
import { ProjectManager } from "../../lib/project-manager.ts";
import { AppVariables, isCacheEnabled, isReadOnly } from "./context.ts";
import { VERSION } from "../../lib/version.ts";
import type { CerveauReader } from "../../lib/cerveau/reader.ts";

// Cerveau viewer routes
import { cerveauRouter } from "./features/cerveau.ts";

// SSE events route
import { eventsRouter } from "./events.ts";

// Context-pack route
import { contextPackRouter } from "./context-pack.ts";

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
import { brainstormsRouter } from "./features/brainstorms.ts";
import { reflectionTemplatesRouter } from "./features/reflection-templates.ts";
import { reflectionsRouter } from "./features/reflections.ts";
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
import { dnsRouter } from "./features/dns.ts";
import { habitsRouter } from "./features/habits.ts";
import { fishboneRouter } from "./features/fishbone.ts";
import { marketingPlansRouter } from "./features/marketing-plans.ts";
import { analyticsRouter } from "./features/analytics.ts";
import { eisenhowerRouter } from "./features/eisenhower.ts";
import { safeRouter } from "./features/safe.ts";
import { investorsRouter } from "./features/investors.ts";
import { kpisRouter } from "./features/kpis.ts";
import { orgchartRouter } from "./features/orgchart.ts";
import { peopleRouter } from "./features/people.ts";
import { portfolioRouter } from "./portfolio.ts";

// Auth routes
import { createAuthRouter } from "./auth.ts";
import {
  parseSessionCookie,
  validateSession,
  validateToken,
} from "../../lib/auth.ts";

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

// Integrations routes
import { integrationsRouter } from "./integrations.ts";
import { githubRouter } from "./github.ts";

export function createApiRouter(
  projectManager: ProjectManager,
  opts?: {
    cerveauReader?: CerveauReader;
    corsOrigin?: string;
    apiToken?: string;
    maxBodySize?: number;
    rateLimitPerMinute?: number;
  },
): Hono<{ Variables: AppVariables }> {
  const api = new OpenAPIHono<{ Variables: AppVariables }>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            error: "VALIDATION_ERROR",
            message: result.error.issues
              .map((i: { path: (string | number)[]; message: string }) =>
                `${i.path.join(".")}: ${i.message}`
              )
              .join("; "),
          },
          400,
        );
      }
    },
  });

  // CORS middleware — restrict to configured origin when set
  const corsOpts = opts?.corsOrigin
    ? { origin: opts.corsOrigin, credentials: !!opts?.apiToken }
    : undefined;
  api.use("/*", cors(corsOpts));

  // Request logging — structured JSON, one line per request
  api.use("/*", async (c, next) => {
    // Skip SSE keepalives and OPTIONS preflight
    if (c.req.method === "OPTIONS" || c.req.path === "/api/events") {
      return next();
    }

    const requestId = c.req.header("X-Request-ID") ?? crypto.randomUUID();
    c.header("X-Request-ID", requestId);
    const start = performance.now();

    await next();

    const duration = Math.round(performance.now() - start);
    const status = c.res.status;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    console.info(
      JSON.stringify({
        level,
        ts: new Date().toISOString(),
        method: c.req.method,
        path: c.req.path,
        status,
        duration_ms: duration,
        request_id: requestId,
      }),
    );
  });

  // Auth routes + middleware — only when --api-token is configured
  if (opts?.apiToken) {
    const apiToken = opts.apiToken;
    api.route("/auth", createAuthRouter(apiToken));
  } else {
    // No auth configured — register a permanent stub so the browser check
    // returns 200 instead of 404, eliminating the console error.
    api.get(
      "/auth/check",
      (c) => c.json({ required: false, authenticated: true }, 200),
    );
  }

  if (opts?.apiToken) {
    const apiToken = opts.apiToken;

    api.use("/*", async (c, next) => {
      const path = c.req.path;
      // Allow-listed paths that skip auth
      if (
        c.req.method === "OPTIONS" ||
        path === "/api/health" ||
        path === "/api/version" ||
        path === "/api/doc" ||
        path === "/api/reference" ||
        path.startsWith("/api/auth")
      ) {
        return next();
      }

      // Bearer token header
      const authHeader = c.req.header("Authorization") ?? "";
      if (authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        if (validateToken(token, apiToken)) {
          return next();
        }
      }

      // Session cookie
      const cookie = c.req.header("Cookie") ?? "";
      const sessionId = parseSessionCookie(cookie);
      if (sessionId && validateSession(sessionId)) {
        return next();
      }

      return c.json(
        { error: "NOT_AUTHENTICATED", message: "Authentication required" },
        401,
      );
    });
  }

  // Body size limit — default 10MB
  const maxBody = opts?.maxBodySize ?? 10 * 1024 * 1024;
  api.use(
    "/*",
    bodyLimit({
      maxSize: maxBody,
      onError: (c) =>
        c.json(
          {
            error: "PAYLOAD_TOO_LARGE",
            message: `Request body exceeds ${
              Math.floor(maxBody / 1024 / 1024)
            }MB limit`,
          },
          413,
        ),
    }),
  );

  // Rate limiting — per-IP sliding window, default 1000 req/min
  const rateLimit = opts?.rateLimitPerMinute ?? 1000;
  const limiter = new RateLimiter({
    maxRequests: rateLimit,
    windowMs: 60_000,
  });

  api.use("/*", async (c, next) => {
    // Skip rate limiting for SSE (long-lived connection) and OPTIONS
    if (c.req.method === "OPTIONS" || c.req.path === "/api/events") {
      return next();
    }

    const ip = c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
      c.req.header("X-Real-IP") ?? "unknown";
    const result = limiter.check(ip);

    c.header("X-RateLimit-Limit", String(rateLimit));
    c.header("X-RateLimit-Remaining", String(result.remaining));

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      c.header("Retry-After", String(retryAfter));
      return c.json(
        { error: "RATE_LIMITED", message: "Too many requests" },
        429,
      );
    }

    return next();
  });

  // Inject projectManager and optional cerveau reader into context
  api.use("/*", async (c, next) => {
    c.set("projectManager", projectManager);
    if (opts?.cerveauReader) {
      c.set("cerveauReader", opts.cerveauReader);
    }
    await next();
  });

  // Health check — no auth required
  const startedAt = Date.now();
  const healthRoute = createRoute({
    method: "get",
    path: "/health",
    tags: ["Core"],
    summary: "Health check",
    operationId: "healthCheck",
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              status: z.string().openapi({ example: "ok" }),
              version: z.string().openapi({ example: "0.25.2" }),
              uptime: z.number().openapi({
                description: "Server uptime in seconds",
              }),
              cache: z.boolean().openapi({
                description: "Whether SQLite cache is enabled",
              }),
            }).openapi("HealthResponse"),
          },
        },
        description: "Server is healthy",
      },
    },
  });
  api.openapi(healthRoute, (c) => {
    return c.json({
      status: "ok",
      version: VERSION,
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      cache: isCacheEnabled(c),
    }, 200);
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

  // SSE events
  api.route("/events", eventsRouter);

  // Context-pack route
  api.route("/context-pack", contextPackRouter);

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
  api.route("/brainstorms", brainstormsRouter);
  api.route("/reflection-templates", reflectionTemplatesRouter);
  api.route("/reflections", reflectionsRouter);
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

  // Integration secrets routes
  api.route("/integrations", integrationsRouter);

  // GitHub integration routes (repo summary, issues)
  api.route("/integrations/github", githubRouter);

  // DNS routes
  api.route("/dns", dnsRouter);

  // Habits routes
  api.route("/habits", habitsRouter);

  // Fishbone routes
  api.route("/fishbone", fishboneRouter);

  // Marketing plans routes
  api.route("/marketing-plans", marketingPlansRouter);

  // Analytics routes
  api.route("/analytics", analyticsRouter);

  // Cerveau viewer routes (feature-gated via --cerveau-dir)
  if (opts?.cerveauReader) {
    api.route("/cerveau", cerveauRouter);
  }

  // OpenAPI spec endpoint — auto-generated from Zod schemas
  api.doc31("/doc", {
    openapi: "3.1.0",
    info: {
      title: "MDPlanner API",
      version: VERSION,
      description:
        "Markdown-based project management API. All data stored as markdown files with YAML frontmatter.",
      license: { name: "MIT", url: "https://opensource.org/licenses/MIT" },
    },
  });

  // Scalar API reference UI — interactive docs at /api/reference
  api.get(
    "/reference",
    apiReference({ url: "/api/doc", theme: "default" }),
  );

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
