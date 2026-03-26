import { OpenAPIHono } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { dnsRouter } from "./v1/dns/routes.ts";
import { goalsRouter } from "./v1/goals/routes.ts";
import { milestonesRouter } from "./v1/milestones/routes.ts";
import { notesRouter } from "./v1/notes/routes.ts";
import { peopleRouter } from "./v1/people/routes.ts";
import { portfolioRouter } from "./v1/portfolio/routes.ts";
import { settingsRouter } from "./v1/settings/routes.ts";
import { tasksRouter } from "./v1/tasks/routes.ts";
import { APP_NAME, APP_VERSION } from "../constants/mod.ts";

const v1 = new OpenAPIHono();
v1.route("/dns", dnsRouter);
v1.route("/goals", goalsRouter);
v1.route("/milestones", milestonesRouter);
v1.route("/notes", notesRouter);
v1.route("/people", peopleRouter);
v1.route("/portfolio", portfolioRouter);
v1.route("/settings", settingsRouter);
v1.route("/tasks", tasksRouter);

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
