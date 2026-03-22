// SSR view router — mounts all view routers. Add new domains here.
// Each domain owns its routes file under views/<domain>/routes.ts.

import { Hono } from "hono";
import { homeViewRouter } from "./home/routes.ts";
import { milestonesRouter } from "./milestones/routes.ts";
import { peopleRouter } from "./people/routes.tsx";
import { notesRouter as notesViewRouter } from "./notes/routes.ts";
import { tasksRouter } from "./tasks/routes.ts";
import { settingsViewRouter } from "./settings/routes.ts";
import { portfolioRouter } from "./portfolio/routes.ts";
import { githubSummaryRouter } from "./github-summary/routes.ts";
import { searchRouter } from "./search/routes.ts";
import { sidebarRouter } from "./sidebar/routes.ts";
import {
  autocompleteRouter,
  registerAutocompleteSource,
} from "./autocomplete/routes.ts";
import {
  getMilestoneService,
  getPeopleService,
  getPortfolioService,
  getTaskService,
} from "../singletons/services.ts";
import type { AppVariables } from "../types/app.ts";

// Register autocomplete sources — add new ones here as domains grow.
registerAutocompleteSource("portfolio", {
  list: () => getPortfolioService().list(),
  search: (q) => getPortfolioService().search(q),
  displayKey: "name",
  valueKey: "name",
});

registerAutocompleteSource("people", {
  list: () => getPeopleService().list(),
  search: async (q) => {
    const all = await getPeopleService().list();
    const lower = q.toLowerCase();
    return all.filter((p) => p.name.toLowerCase().includes(lower));
  },
  displayKey: "name",
  valueKey: "id",
});

registerAutocompleteSource("people-skills", {
  list: async () => {
    const all = await getPeopleService().list();
    const skills = new Set<string>();
    for (const p of all) {
      for (const s of p.skills ?? []) skills.add(s);
    }
    return [...skills].sort().map((s) => ({ name: s }));
  },
  search: async (q) => {
    const all = await getPeopleService().list();
    const skills = new Set<string>();
    for (const p of all) {
      for (const s of p.skills ?? []) skills.add(s);
    }
    const lower = q.toLowerCase();
    return [...skills]
      .filter((s) => s.toLowerCase().includes(lower))
      .sort()
      .map((s) => ({ name: s }));
  },
  displayKey: "name",
  valueKey: "name",
});

registerAutocompleteSource("tasks", {
  list: () => getTaskService().list(),
  search: async (q) => {
    const all = await getTaskService().list();
    const lower = q.toLowerCase();
    return all.filter((t) => t.title.toLowerCase().includes(lower));
  },
  displayKey: "title",
  valueKey: "id",
});

registerAutocompleteSource("milestones", {
  list: () => getMilestoneService().list(),
  search: async (q) => {
    const all = await getMilestoneService().list();
    const lower = q.toLowerCase();
    return all.filter((m) => m.name.toLowerCase().includes(lower));
  },
  displayKey: "name",
  valueKey: "name",
});

registerAutocompleteSource("project-tags", {
  list: async () => {
    const all = await getTaskService().list();
    const tags = new Set<string>();
    for (const t of all) {
      for (const tag of t.tags ?? []) tags.add(tag);
    }
    return [...tags].sort().map((t) => ({ name: t }));
  },
  search: async (q) => {
    const all = await getTaskService().list();
    const tags = new Set<string>();
    for (const t of all) {
      for (const tag of t.tags ?? []) tags.add(tag);
    }
    const lower = q.toLowerCase();
    return [...tags]
      .filter((t) => t.toLowerCase().includes(lower))
      .sort()
      .map((t) => ({ name: t }));
  },
  displayKey: "name",
  valueKey: "name",
});

registerAutocompleteSource("portfolio-tech-stack", {
  list: async () => {
    const all = await getPortfolioService().list();
    const techs = new Set<string>();
    for (const p of all) {
      for (const t of p.techStack ?? []) techs.add(t);
    }
    return [...techs].sort().map((t) => ({ name: t }));
  },
  search: async (q) => {
    const all = await getPortfolioService().list();
    const techs = new Set<string>();
    for (const p of all) {
      for (const t of p.techStack ?? []) techs.add(t);
    }
    const lower = q.toLowerCase();
    return [...techs]
      .filter((t) => t.toLowerCase().includes(lower))
      .sort()
      .map((t) => ({ name: t }));
  },
  displayKey: "name",
  valueKey: "name",
});

registerAutocompleteSource("portfolio-categories", {
  list: async () => {
    const all = await getPortfolioService().list();
    const cats = new Set<string>();
    for (const p of all) cats.add(p.category);
    return [...cats].sort().map((c) => ({ name: c }));
  },
  search: async (q) => {
    const all = await getPortfolioService().list();
    const cats = new Set<string>();
    for (const p of all) cats.add(p.category);
    const lower = q.toLowerCase();
    return [...cats]
      .filter((c) => c.toLowerCase().includes(lower))
      .sort()
      .map((c) => ({ name: c }));
  },
  displayKey: "name",
  valueKey: "name",
});

registerAutocompleteSource("people-departments", {
  list: async () => {
    const depts = await getPeopleService().getDepartments();
    return depts.map((d) => ({ name: d }));
  },
  search: async (q) => {
    const depts = await getPeopleService().getDepartments();
    const lower = q.toLowerCase();
    return depts
      .filter((d) => d.toLowerCase().includes(lower))
      .map((d) => ({ name: d }));
  },
  displayKey: "name",
  valueKey: "name",
});

export const views = new Hono<{ Variables: AppVariables }>();

views.route("/", homeViewRouter);
views.route("/milestones", milestonesRouter);
views.route("/notes", notesViewRouter);
views.route("/people", peopleRouter);
views.route("/portfolio", portfolioRouter);
views.route("/tasks", tasksRouter);
views.route("/github", githubSummaryRouter);
views.route("/settings", settingsViewRouter);
views.route("/search", searchRouter);
views.route("/autocomplete", autocompleteRouter);
views.route("/sidebar", sidebarRouter);
