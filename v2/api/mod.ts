import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { brainstormsRouter } from "./v1/brainstorms/routes.ts";
import { briefsRouter } from "./v1/briefs/routes.ts";
import { retrospectivesRouter } from "./v1/retrospectives/routes.ts";
import { meetingsRouter } from "./v1/meetings/routes.ts";
import { leanCanvasesRouter } from "./v1/lean-canvases/routes.ts";
import { billingRatesRouter } from "./v1/billing-rates/routes.ts";
import { customersRouter } from "./v1/customers/routes.ts";
import { invoicesRouter } from "./v1/invoices/routes.ts";
import { paymentsRouter } from "./v1/payments/routes.ts";
import { quotesRouter } from "./v1/quotes/routes.ts";
import { dnsRouter } from "./v1/dns/routes.ts";
import { goalsRouter } from "./v1/goals/routes.ts";
import { ideasRouter } from "./v1/ideas/routes.ts";
import { marketingPlansRouter } from "./v1/marketing-plans/routes.ts";
import { swotApiRouter } from "./v1/swot/routes.ts";
import { moscowApiRouter } from "./v1/moscow/routes.ts";
import { milestonesRouter } from "./v1/milestones/routes.ts";
import { notesRouter } from "./v1/notes/routes.ts";
import { peopleRouter } from "./v1/people/routes.ts";
import { portfolioRouter } from "./v1/portfolio/routes.ts";
import { settingsRouter } from "./v1/settings/routes.ts";
import { tasksRouter } from "./v1/tasks/routes.ts";
import { stickyNotesRouter } from "./v1/sticky-notes/routes.ts";
import { APP_NAME, APP_VERSION } from "../constants/mod.ts";

const v1 = new OpenAPIHono();
v1.route("/brainstorms", brainstormsRouter);
v1.route("/briefs", briefsRouter);
v1.route("/retrospectives", retrospectivesRouter);
v1.route("/meetings", meetingsRouter);
v1.route("/lean-canvases", leanCanvasesRouter);
v1.route("/billing-rates", billingRatesRouter);
v1.route("/customers", customersRouter);
v1.route("/invoices", invoicesRouter);
v1.route("/payments", paymentsRouter);
v1.route("/quotes", quotesRouter);
v1.route("/dns", dnsRouter);
v1.route("/goals", goalsRouter);
v1.route("/ideas", ideasRouter);
v1.route("/marketing-plans", marketingPlansRouter);
v1.route("/swot", swotApiRouter);
v1.route("/moscow", moscowApiRouter);
v1.route("/milestones", milestonesRouter);
v1.route("/notes", notesRouter);
v1.route("/people", peopleRouter);
v1.route("/portfolio", portfolioRouter);
v1.route("/settings", settingsRouter);
v1.route("/tasks", tasksRouter);
v1.route("/sticky-notes", stickyNotesRouter);

v1.doc("/doc", {
  openapi: "3.1.0",
  info: { title: `${APP_NAME} API`, version: APP_VERSION },
  servers: [
    { url: "/api/v1", description: "JSON API (v1)" },
    { url: "/", description: "htmx views (SSR HTML)" },
  ],
});

v1.get(
  "/reference",
  apiReference({
    url: "/api/v1/doc",
    theme: "default",
    cdn: "/js/vendor/scalar-api-reference-1.28.12.min.js",
    hideClientButton: true,
    defaultHttpClient: { targetKey: "shell", clientKey: "curl" },
  }),
);

const api = new OpenAPIHono();
api.route("/v1", v1);

export { api };
