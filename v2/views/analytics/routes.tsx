// Analytics view route — GET /analytics

import { Hono } from "hono";
import { getProjectAnalytics } from "../../services/analytics.service.ts";
import {
  getCustomerService,
  getPeopleService,
  getPortfolioService,
} from "../../singletons/services.ts";
import { ALL_SECTIONS, AnalyticsBody, AnalyticsView } from "../analytics.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { readUiState, writeUiState } from "../../utils/ui-state.ts";
import type { AppVariables } from "../../types/app.ts";
import { ANONYMOUS_ACTOR } from "../../types/actor.ts";
import { resolveUserScope } from "../../utils/actor.ts";

export const analyticsViewRouter = new Hono<{ Variables: AppVariables }>();

analyticsViewRouter.get("/", async (c) => {
  const actor = c.get("actor") ?? ANONYMOUS_ACTOR;

  // Apply actor as default person filter when not overridden by query param
  const rawPerson = c.req.query("person");
  const person = rawPerson !== undefined
    ? rawPerson
    : actor.source !== "anonymous"
    ? actor.name
    : undefined;

  const filters = {
    customer: c.req.query("customer") || undefined,
    project: c.req.query("project") || undefined,
    person: person || undefined,
    from: c.req.query("from") || undefined,
    to: c.req.query("to") || undefined,
  };

  const uiState = readUiState<{ analyticsHiddenSections?: string[] }>(
    c,
    "analytics",
  );
  const hiddenSections: string[] = uiState.analyticsHiddenSections ?? [];

  const scope = await resolveUserScope(c);
  const [data, allCustomers, allProjects, allPeople] = await Promise.all([
    getProjectAnalytics(filters, scope),
    getCustomerService().list(),
    getPortfolioService().list(),
    getPeopleService().list(),
  ]);

  const customers = allCustomers.map((c) => ({ id: c.id, label: c.name }));
  const projects = allProjects.map((p) => ({ id: p.name, label: p.name }));
  const people = allPeople.map((p) => ({ id: p.name, label: p.name }));

  const bodyProps = { data, customers, projects, people, hiddenSections };

  // Htmx partial — return only the <main> fragment to swap into #analytics-content
  if (c.req.header("HX-Request")) {
    return c.html(<AnalyticsBody {...bodyProps} />);
  }

  return c.html(
    <AnalyticsView {...viewProps(c, "/analytics")} {...bodyProps} />,
  );
});

analyticsViewRouter.post("/customize", async (c) => {
  const body = await c.req.parseBody({ all: true });
  const checked = Array.isArray(body["sections"])
    ? (body["sections"] as string[])
    : body["sections"]
    ? [body["sections"] as string]
    : [];

  const allKeys = ALL_SECTIONS.map((s) => s.key);
  const hidden = allKeys.filter((k) => !checked.includes(k));

  const existing = readUiState<{ analyticsHiddenSections?: string[] }>(
    c,
    "analytics",
  );
  writeUiState(c, "analytics", {
    ...existing,
    analyticsHiddenSections: hidden,
  });

  const actor = c.get("actor") ?? ANONYMOUS_ACTOR;
  const person = actor.source !== "anonymous" ? actor.name : undefined;
  const filters = { person: person || undefined };

  const scope = await resolveUserScope(c);
  const [data, allCustomers, allProjects, allPeople] = await Promise.all([
    getProjectAnalytics(filters, scope),
    getCustomerService().list(),
    getPortfolioService().list(),
    getPeopleService().list(),
  ]);

  const customers = allCustomers.map((c) => ({ id: c.id, label: c.name }));
  const projects = allProjects.map((p) => ({ id: p.name, label: p.name }));
  const people = allPeople.map((p) => ({ id: p.name, label: p.name }));

  return c.html(
    <AnalyticsBody
      data={data}
      customers={customers}
      projects={projects}
      people={people}
      hiddenSections={hidden}
    />,
  );
});
