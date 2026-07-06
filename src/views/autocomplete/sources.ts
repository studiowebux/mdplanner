// Autocomplete source registrations — one entry per `@mention`/reference field.
// Imported for side effects by views/mod.tsx so every source is registered at
// module load. Each source's `search` uses foldIncludes (accent/space/
// punctuation-insensitive); autocomplete/routes.ts delegates to these.

import { registerAutocompleteSource } from "./routes.ts";
import {
  getBillingRateService,
  getBrainstormTemplateService,
  getCompanyService,
  getCustomerService,
  getGoalService,
  getIdeaService,
  getInvoiceService,
  getMeetingService,
  getMilestoneService,
  getNoteService,
  getPeopleService,
  getPortfolioService,
  getProjectService,
  getQuoteService,
  getReflectionTemplateService,
  getTaskService,
} from "../../singletons/services.ts";
import { DEFAULT_KPI_METRICS } from "../../constants/mod.ts";
import { foldIncludes } from "../../utils/string.ts";

// Register autocomplete sources — add new ones here as domains grow.
registerAutocompleteSource("portfolio", {
  list: () => getPortfolioService().list(),
  search: (q) => getPortfolioService().search(q),
  displayKey: "name",
  valueKey: "name",
});

// Cross-domain entity search for note wiki-links (`[[id|name]]`). Returns
// {id, title} across notes, tasks, portfolio items, and people, matched by
// title; archived rows excluded. No listing without a query (avoid dumping
// every entity). The id prefix encodes the type, so the client builds the
// token and WikiLinkText resolves the href from it.
registerAutocompleteSource("entities", {
  list: () => Promise.resolve([]),
  search: async (q) => {
    const [notes, tasks, portfolio, people] = await Promise.all([
      getNoteService().list(),
      getTaskService().list(),
      getPortfolioService().list(),
      getPeopleService().list(),
    ]);
    const out: { id: string; title: string }[] = [];
    const collect = (
      rows: { id: string; archived?: boolean }[],
      titleKey: "title" | "name",
    ) => {
      for (const r of rows) {
        if (r.archived) continue;
        const title = String((r as Record<string, unknown>)[titleKey] ?? "");
        if (title && foldIncludes(title, q)) out.push({ id: r.id, title });
      }
    };
    collect(notes, "title");
    collect(tasks, "title");
    collect(portfolio, "name");
    collect(people, "name");
    return out.slice(0, 12);
  },
  displayKey: "title",
  valueKey: "id",
  extraKeys: ["title"],
});

registerAutocompleteSource("people", {
  list: () => getPeopleService().list(),
  search: async (q) => {
    const all = await getPeopleService().list();
    return all.filter((p) => foldIncludes(p.name, q));
  },
  displayKey: "name",
  valueKey: "id",
});

registerAutocompleteSource("people-names", {
  list: () => getPeopleService().list(),
  search: async (q) => {
    const all = await getPeopleService().list();
    return all.filter((p) => foldIncludes(p.name, q));
  },
  displayKey: "name",
  valueKey: "name",
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
      .filter((s) => foldIncludes(s, q))
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
    return all.filter((t) => foldIncludes(t.title, q));
  },
  displayKey: "title",
  valueKey: "id",
});

registerAutocompleteSource("milestones", {
  list: () => getMilestoneService().list(),
  search: async (q) => {
    const all = await getMilestoneService().list();
    return all.filter((m) => foldIncludes(m.name, q));
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
      .filter((t) => foldIncludes(t, q))
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
      .filter((t) => foldIncludes(t, q))
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
      .filter((c) => foldIncludes(c, q))
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
      .filter((d) => foldIncludes(d, q))
      .map((d) => ({ name: d }));
  },
  displayKey: "name",
  valueKey: "name",
});

registerAutocompleteSource("portfolio-by-id", {
  list: () => getPortfolioService().list(),
  search: async (q) => {
    const all = await getPortfolioService().list();
    return all.filter((p) => foldIncludes(p.name, q));
  },
  displayKey: "name",
  valueKey: "id",
});

registerAutocompleteSource("customers", {
  list: () => getCustomerService().list(),
  search: async (q) => {
    const all = await getCustomerService().list();
    return all.filter((c) => foldIncludes(c.name, q));
  },
  displayKey: "name",
  valueKey: "id",
});

registerAutocompleteSource("companies", {
  list: () => getCompanyService().list(),
  search: async (q) => {
    const all = await getCompanyService().list();
    return all.filter((c) => foldIncludes(c.name, q));
  },
  displayKey: "name",
  valueKey: "name",
});

// Invoice → quote reference. Only ACCEPTED, not-yet-converted quotes are
// eligible (an invoice derives from one quote). Label shows number — title —
// customer; the stored value is the quote id.
async function quoteAutocompleteOptions(): Promise<
  Array<{ id: string; label: string }>
> {
  const [quotes, customers] = await Promise.all([
    getQuoteService().list(),
    getCustomerService().list(),
  ]);
  const customerName = new Map(customers.map((c) => [c.id, c.name]));
  return quotes
    .filter((q) => q.status === "accepted" && !q.convertedToInvoice)
    .map((q) => ({
      id: q.id,
      label: `${q.number} — ${q.title} (${
        customerName.get(q.customerId) ?? q.customerId
      })`,
    }));
}

registerAutocompleteSource("quotes-by-id", {
  list: () => quoteAutocompleteOptions(),
  search: async (q) =>
    (await quoteAutocompleteOptions()).filter((o) => foldIncludes(o.label, q)),
  displayKey: "label",
  valueKey: "id",
});

// Payment → invoice reference. Lists every invoice (label number — title —
// customer); the stored value is the invoice id. Lets payment recording link to
// an invoice without pasting a raw id (focus shows all; no second tab needed).
async function invoiceAutocompleteOptions(): Promise<
  Array<{ id: string; label: string }>
> {
  const [invoices, customers] = await Promise.all([
    getInvoiceService().list(),
    getCustomerService().list(),
  ]);
  const customerName = new Map(customers.map((c) => [c.id, c.name]));
  return invoices.map((inv) => ({
    id: inv.id,
    label: `${inv.number} — ${inv.title} (${
      customerName.get(inv.customerId) ?? inv.customerId
    })`,
  }));
}

registerAutocompleteSource("invoices-by-id", {
  list: () => invoiceAutocompleteOptions(),
  search: async (q) =>
    (await invoiceAutocompleteOptions()).filter((o) =>
      foldIncludes(o.label, q)
    ),
  displayKey: "label",
  valueKey: "id",
});

registerAutocompleteSource("goals-by-id", {
  list: () => getGoalService().list(),
  search: async (q) => {
    const all = await getGoalService().list();
    return all.filter((g) => foldIncludes(g.title, q));
  },
  displayKey: "title",
  valueKey: "id",
});

registerAutocompleteSource("ideas-by-id", {
  list: () => getIdeaService().list(),
  search: async (q) => {
    const all = await getIdeaService().list();
    return all.filter((i) => foldIncludes(i.title, q));
  },
  displayKey: "title",
  valueKey: "id",
});

registerAutocompleteSource("meetings-by-id", {
  list: () => getMeetingService().list(),
  search: async (q) => {
    const all = await getMeetingService().list();
    return all.filter((m) => foldIncludes(m.title, q));
  },
  displayKey: "title",
  valueKey: "id",
});

registerAutocompleteSource("reflection-templates-by-id", {
  list: () => getReflectionTemplateService().list({}),
  search: async (q) => {
    const all = await getReflectionTemplateService().list({});
    return all.filter((t) => foldIncludes(t.name, q));
  },
  displayKey: "name",
  valueKey: "id",
});

registerAutocompleteSource("brainstorm-templates-by-id", {
  list: () => getBrainstormTemplateService().list({}),
  search: async (q) => {
    const all = await getBrainstormTemplateService().list({});
    return all.filter((t) => foldIncludes(t.name, q));
  },
  displayKey: "name",
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
      .filter((m) => foldIncludes(m, q))
      .map((m) => ({ name: m }));
  },
  displayKey: "name",
  valueKey: "name",
});

registerAutocompleteSource("billing-rates", {
  list: () => getBillingRateService().list(),
  search: async (q) => {
    const all = await getBillingRateService().list();
    return all.filter((r) => foldIncludes(r.name, q));
  },
  displayKey: "name",
  valueKey: "id",
  extraKeys: ["unit", "rate"],
});

// Returns milestones + portfolio items for capacity plan allocation targeting.
// value = ID, targetType extra key used to autofill the hidden targetType input.
registerAutocompleteSource("capacity-targets", {
  list: async () => {
    const [milestones, portfolio] = await Promise.all([
      getMilestoneService().list(),
      getPortfolioService().list(),
    ]);
    return [
      ...milestones.map((m) => ({
        id: m.id,
        name: m.name,
        targetType: "milestone",
      })),
      ...portfolio.map((p) => ({
        id: p.id,
        name: p.name,
        targetType: "project",
      })),
    ];
  },
  search: async (q) => {
    const [milestones, portfolio] = await Promise.all([
      getMilestoneService().list(),
      getPortfolioService().list(),
    ]);
    const items = [
      ...milestones.map((m) => ({
        id: m.id,
        name: m.name,
        targetType: "milestone",
      })),
      ...portfolio.map((p) => ({
        id: p.id,
        name: p.name,
        targetType: "project",
      })),
    ];
    return items.filter((i) => foldIncludes(i.name, q));
  },
  displayKey: "name",
  valueKey: "id",
  extraKeys: ["targetType"],
});
