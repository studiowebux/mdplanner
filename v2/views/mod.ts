// SSR view router — mounts all view routers. Add new domains here.
// Each domain owns its routes file under views/<domain>/routes.ts.

import { Hono } from "hono";
import { homeViewRouter } from "./home/routes.ts";
import { milestonesRouter } from "./milestones/routes.ts";
import { peopleRouter } from "./people/routes.ts";
import { settingsViewRouter } from "./settings/routes.ts";
import { searchRouter } from "./search/routes.ts";
import { sidebarRouter } from "./sidebar/routes.ts";
import {
  autocompleteRouter,
  registerAutocompleteSource,
} from "./autocomplete/routes.ts";
import {
  getPeopleService,
  getPortfolioService,
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
views.route("/people", peopleRouter);
views.route("/settings", settingsViewRouter);
views.route("/search", searchRouter);
views.route("/autocomplete", autocompleteRouter);
views.route("/sidebar", sidebarRouter);
