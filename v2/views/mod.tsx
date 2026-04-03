// SSR view router — mounts all view routers. Add new domains here.
// Each domain owns its routes file under views/<domain>/routes.tsx.

import { Hono } from "hono";
import { dnsRouter } from "./dns/routes.tsx";
import { goalsRouter as goalsViewRouter } from "./goals/routes.tsx";
import { ideasRouter } from "./ideas/routes.tsx";
import { homeViewRouter } from "./home/routes.tsx";
import { milestonesRouter } from "./milestones/routes.tsx";
import { peopleRouter } from "./people/routes.tsx";
import { notesRouter as notesViewRouter } from "./notes/routes.tsx";
import { tasksRouter } from "./tasks/routes.tsx";
import { settingsViewRouter } from "./settings/routes.tsx";
import { portfolioRouter } from "./portfolio/routes.tsx";
import { githubSummaryRouter } from "./github-summary/routes.tsx";
import { searchRouter } from "./search/routes.tsx";
import { sidebarRouter } from "./sidebar/routes.tsx";
import {
  autocompleteRouter,
  registerAutocompleteSource,
} from "./autocomplete/routes.ts";
import { billingRatesRouter } from "./billing-rates/routes.tsx";
import { customersRouter } from "./customers/routes.tsx";
import { invoicesRouter } from "./invoices/routes.tsx";
import { paymentsRouter } from "./payments/routes.tsx";
import { quotesRouter } from "./quotes/routes.tsx";
import { marketingPlansRouter } from "./marketing-plans/routes.tsx";
import { swotRouter } from "./swot/routes.tsx";
import { brainstormsRouter } from "./brainstorms/routes.tsx";
import { briefsRouter } from "./briefs/routes.tsx";
import {
  getArrayTableSection,
  registerArrayTableSection,
} from "../components/ui/array-table-registry.ts";
import { ArrayTableRow } from "../components/ui/form-builder.tsx";
import { BRAINSTORM_FORM_FIELDS } from "../domains/brainstorm/constants.tsx";
import { INVOICE_FORM_FIELDS } from "../domains/invoice/constants.tsx";
import { MKTPLAN_FORM_FIELDS } from "../domains/marketing-plan/constants.tsx";
import { QUOTE_FORM_FIELDS } from "../domains/quote/constants.tsx";
import type { FieldDef } from "../components/ui/form-builder.tsx";
import {
  getBillingRateService,
  getCustomerService,
  getGoalService,
  getIdeaService,
  getMilestoneService,
  getPeopleService,
  getPortfolioService,
  getProjectService,
  getTaskService,
} from "../singletons/services.ts";
import { DEFAULT_KPI_METRICS } from "../constants/mod.ts";
import type { AppVariables } from "../types/app.ts";
import { ciIncludes } from "../utils/string.ts";

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
    return all.filter((p) => ciIncludes(p.name, q));
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
    return [...skills]
      .filter((s) => ciIncludes(s, q))
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
    return all.filter((t) => ciIncludes(t.title, q));
  },
  displayKey: "title",
  valueKey: "id",
});

registerAutocompleteSource("milestones", {
  list: () => getMilestoneService().list(),
  search: async (q) => {
    const all = await getMilestoneService().list();
    return all.filter((m) => ciIncludes(m.name, q));
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
    return [...tags]
      .filter((t) => ciIncludes(t, q))
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
    return [...techs]
      .filter((t) => ciIncludes(t, q))
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
    return [...cats]
      .filter((c) => ciIncludes(c, q))
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
    return depts
      .filter((d) => ciIncludes(d, q))
      .map((d) => ({ name: d }));
  },
  displayKey: "name",
  valueKey: "name",
});

registerAutocompleteSource("portfolio-by-id", {
  list: () => getPortfolioService().list(),
  search: async (q) => {
    const all = await getPortfolioService().list();
    return all.filter((p) => ciIncludes(p.name, q));
  },
  displayKey: "name",
  valueKey: "id",
});

registerAutocompleteSource("customers", {
  list: () => getCustomerService().list(),
  search: async (q) => {
    const all = await getCustomerService().list();
    return all.filter((c) => ciIncludes(c.name, q));
  },
  displayKey: "name",
  valueKey: "id",
});

registerAutocompleteSource("goals-by-id", {
  list: () => getGoalService().list(),
  search: async (q) => {
    const all = await getGoalService().list();
    return all.filter((g) => ciIncludes(g.title, q));
  },
  displayKey: "title",
  valueKey: "id",
});

registerAutocompleteSource("ideas-by-id", {
  list: () => getIdeaService().list(),
  search: async (q) => {
    const all = await getIdeaService().list();
    return all.filter((i) => ciIncludes(i.title, q));
  },
  displayKey: "title",
  valueKey: "id",
});

registerAutocompleteSource("kpi-metrics", {
  list: async () => {
    const config = await getProjectService().getConfig();
    const metrics = config.kpiMetrics?.length
      ? config.kpiMetrics
      : DEFAULT_KPI_METRICS;
    return metrics.map((m) => ({ name: m }));
  },
  search: async (q) => {
    const config = await getProjectService().getConfig();
    const metrics = config.kpiMetrics?.length
      ? config.kpiMetrics
      : DEFAULT_KPI_METRICS;
    return metrics
      .filter((m) => ciIncludes(m, q))
      .map((m) => ({ name: m }));
  },
  displayKey: "name",
  valueKey: "name",
});

registerAutocompleteSource("billing-rates", {
  list: () => getBillingRateService().list(),
  search: async (q) => {
    const all = await getBillingRateService().list();
    return all.filter((r) => ciIncludes(r.name, q));
  },
  displayKey: "name",
  valueKey: "id",
  extraKeys: ["unit", "rate"],
});

export const views = new Hono<{ Variables: AppVariables }>();

views.route("/", homeViewRouter);
views.route("/billing-rates", billingRatesRouter);
views.route("/customers", customersRouter);
views.route("/invoices", invoicesRouter);
views.route("/payments", paymentsRouter);
views.route("/quotes", quotesRouter);
views.route("/dns", dnsRouter);
views.route("/goals", goalsViewRouter);
views.route("/ideas", ideasRouter);
views.route("/milestones", milestonesRouter);
views.route("/notes", notesViewRouter);
views.route("/people", peopleRouter);
views.route("/portfolio", portfolioRouter);
views.route("/tasks", tasksRouter);
views.route("/github", githubSummaryRouter);
views.route("/settings", settingsViewRouter);
views.route("/search", searchRouter);
views.route("/marketing-plans", marketingPlansRouter);
views.route("/swot", swotRouter);
views.route("/brainstorms", brainstormsRouter);
views.route("/briefs", briefsRouter);
views.route("/autocomplete", autocompleteRouter);
views.route("/sidebar", sidebarRouter);

// Register array-table sections for server-rendered row fragments.
for (
  const fields of [
    MKTPLAN_FORM_FIELDS,
    QUOTE_FORM_FIELDS,
    INVOICE_FORM_FIELDS,
    BRAINSTORM_FORM_FIELDS,
  ]
) {
  for (const field of fields) {
    if ((field as FieldDef & { type: string }).type === "array-table") {
      const f = field as Extract<FieldDef, { type: "array-table" }>;
      registerArrayTableSection(f.section, f.itemFields);
    }
  }
}

// Array-table: return a single empty row fragment for the "Add" button.
// Uses a timestamp-based index to guarantee uniqueness regardless of row removals.
views.get("/forms/array-row/:section", (c) => {
  const section = c.req.param("section");
  const itemFields = getArrayTableSection(section);
  if (!itemFields) return c.notFound();
  const idx = Date.now();
  return c.html(
    <ArrayTableRow section={section} idx={idx} itemFields={itemFields} />,
  );
});
