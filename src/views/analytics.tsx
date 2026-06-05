// Analytics command center — cross-domain metrics, customer-centric filters, quick-add per section.

import type { Child, FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import { TASK_PRIORITY_LABELS } from "../domains/task/constants.tsx";
import { DEAL_STAGE_LABELS, DEAL_STAGES } from "../types/deal.types.ts";
import { utilizationBand } from "../utils/utilization.ts";
import { formatDate } from "../utils/time.ts";
import { formatCurrency } from "../utils/format.ts";

import type { ViewProps } from "../types/app.ts";
import type {
  AnalyticsData,
  AnalyticsFilters,
} from "../types/analytics.types.ts";

// ── filter option shapes ──────────────────────────────────────────────────────

type FilterOption = { id: string; label: string };

export type AnalyticsViewProps = ViewProps & {
  data: AnalyticsData;
  customers: FilterOption[];
  projects: FilterOption[];
  people: FilterOption[];
  hiddenSections: string[];
};

// ── section registry ──────────────────────────────────────────────────────────

export const ALL_SECTIONS: { key: string; label: string }[] = [
  { key: "tasks", label: "Tasks" },
  { key: "goals", label: "Goals" },
  { key: "milestones", label: "Milestones" },
  { key: "timeEntries", label: "Time Tracking" },
  { key: "capacity", label: "Capacity Plans" },
  { key: "invoices", label: "Invoices" },
  { key: "quotes", label: "Quotes" },
  { key: "meetings", label: "Meetings" },
  { key: "customers", label: "Customers" },
  { key: "notes", label: "Notes" },
  { key: "investors", label: "Investors" },
  { key: "finances", label: "Finances" },
  { key: "deals", label: "Deals" },
  { key: "habits", label: "Habits" },
  { key: "journal", label: "Journal" },
  { key: "reflections", label: "Reflections" },
];

// ── helpers ───────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function filterHref(
  base: AnalyticsFilters,
  patch: Partial<AnalyticsFilters>,
): string {
  const merged = { ...base, ...patch };
  const p = new URLSearchParams();
  if (merged.customer) p.set("customer", merged.customer);
  if (merged.project) p.set("project", merged.project);
  if (merged.person) p.set("person", merged.person);
  if (merged.from) p.set("from", merged.from);
  if (merged.to) p.set("to", merged.to);
  const qs = p.toString();
  return `/analytics${qs ? `?${qs}` : ""}`;
}

function pct(n: number | null): string {
  return n != null ? `${n}%` : "—";
}

// ── sub-components ─────────────────────────────────────────────────────────────

const CustomizePanel: FC<{ hiddenSections: string[] }> = (
  { hiddenSections },
) => (
  <details class="analytics__customize">
    <summary class="analytics__customize-toggle btn btn--sm btn--ghost">
      Customize
    </summary>
    <div class="analytics__customize-panel">
      <form
        hx-post="/analytics/customize"
        hx-target="#analytics-content"
        hx-swap="outerHTML"
        hx-indicator="#global-loading"
      >
        <fieldset class="analytics__customize-fieldset">
          <legend class="analytics__customize-legend">Visible sections</legend>
          <div class="analytics__customize-checks">
            {ALL_SECTIONS.map(({ key, label }) => (
              <label key={key} class="analytics__customize-check">
                <input
                  type="checkbox"
                  name="sections"
                  value={key}
                  checked={!hiddenSections.includes(key)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div class="analytics__customize-actions">
          <button type="submit" class="btn btn--sm btn--primary">Apply</button>
        </div>
      </form>
    </div>
  </details>
);

// Category grouping — the 16 sections are organized into a handful of themed
// tabs so the page reads as a dashboard, not a 16-block wall. CSS-only tabs:
// hidden radios + label nav are rendered as siblings of the sections, and
// `#atab-<cat>:checked ~ .analytics__section[data-cat="<cat>"]` reveals only the
// active category (no JS, CSP-safe). Charts use viewBox scaling so hidden
// panels render correctly once shown.

export const CATEGORY_DEFS: {
  key: string;
  label: string;
  sections: string[];
}[] = [
  {
    key: "delivery",
    label: "Delivery",
    sections: ["tasks", "goals", "milestones", "timeEntries", "capacity"],
  },
  {
    key: "revenue",
    label: "Revenue",
    sections: ["invoices", "quotes", "deals", "finances", "investors"],
  },
  { key: "crm", label: "CRM", sections: ["customers", "meetings"] },
  {
    key: "personal",
    label: "Personal",
    sections: ["habits", "journal", "reflections"],
  },
  { key: "knowledge", label: "Knowledge", sections: ["notes"] },
];

const CategoryTabs: FC<{ hiddenSections: string[] }> = ({ hiddenSections }) => {
  const cats = CATEGORY_DEFS
    .map((c) => ({
      ...c,
      count: c.sections.filter((s) => !hiddenSections.includes(s)).length,
    }))
    .filter((c) => c.count > 0);
  if (cats.length === 0) return null;
  return (
    <>
      {cats.map((c, i) => (
        <input
          key={c.key}
          type="radio"
          name="analytics-cat"
          id={`atab-${c.key}`}
          class="analytics__tab-radio"
          checked={i === 0}
        />
      ))}
      <nav class="analytics__tab-nav" aria-label="Analytics categories">
        {cats.map((c) => (
          <label key={c.key} for={`atab-${c.key}`} class="analytics__tab">
            {c.label}
          </label>
        ))}
      </nav>
    </>
  );
};

const SectionHeader: FC<{
  title: string;
  sectionKey: string;
  addLabel: string;
  addRoute: string;
}> = ({ title, sectionKey, addLabel, addRoute }) => (
  <div class="analytics__section-header">
    <h2 class="analytics__section-title">{title}</h2>
    <button
      type="button"
      class="btn btn--sm btn--ghost"
      hx-get={addRoute}
      hx-target="#analytics-sidenav-container"
      hx-swap="innerHTML"
      data-sidenav-open={`analytics-add-${sectionKey}`}
    >
      + {addLabel}
    </button>
  </div>
);

const StatCard: FC<{ label: string; value: string | number }> = (
  { label, value },
) => (
  <div class="analytics__stat-card">
    <span class="analytics__stat-value">{value}</span>
    <span class="analytics__stat-label">{label}</span>
  </div>
);

// ── global summary KPI strip ───────────────────────────────────────────────
// Cross-domain headline metrics above the filter bar. Visually distinct from
// per-section StatCards (accent left-border, left-aligned). All values come
// straight from the already-aggregated AnalyticsData — no new service queries —
// and re-render on every filter swap since the strip sits inside
// #analytics-content. Labels reflect the active filter range, not a fixed month.

const KpiCard: FC<{ label: string; value: string | number }> = (
  { label, value },
) => (
  <div class="analytics__kpi-card">
    <span class="analytics__kpi-value">{value}</span>
    <span class="analytics__kpi-label">{label}</span>
  </div>
);

const GlobalKpiStrip: FC<{ data: AnalyticsData }> = ({ data }) => {
  const openTasks = data.tasks.total - (data.tasks.bySection["Done"] ?? 0);
  return (
    <div class="analytics__kpi-strip">
      <KpiCard label="Open Tasks" value={openTasks} />
      <KpiCard label="Active Milestones" value={data.milestones.total} />
      <KpiCard label="Hours Logged" value={`${data.timeEntries.totalHours}h`} />
      <KpiCard
        label="Revenue"
        value={formatCurrency(data.invoices.totalAmount, { decimals: 2 })}
      />
      <KpiCard
        label="Open Deals"
        value={formatCurrency(data.deals.totalValue, { decimals: 2 })}
      />
      <KpiCard label="Journal Streak" value={data.journal.streak} />
    </div>
  );
};

// ── charts ──────────────────────────────────────────────────────────────────
// Empty container; src/static/js/analytics-charts.js reads data-chart-values and
// builds the SVG. Pure data-attr handoff (CSP-safe), re-rendered on filter swap.

type ChartItem = { label: string; value: number; display?: string };
type GroupedChartItem = {
  label: string;
  values: number[];
  displays?: string[];
};

const AnalyticsChart: FC<
  {
    kind: "bar" | "line" | "donut" | "funnel" | "groupedbar";
    items: ChartItem[] | GroupedChartItem[];
    ariaLabel: string;
  }
> = ({ kind, items, ariaLabel }) => (
  <div
    class="analytics__chart"
    data-chart={kind}
    data-chart-values={JSON.stringify(items)}
    role="img"
    aria-label={ariaLabel}
  />
);

const ByTable: FC<{ rows: [string, number | string][]; unit?: string }> = (
  { rows, unit = "" },
) => (
  <table class="data-table analytics__by-table">
    <tbody>
      {rows.map(([label, val]) => (
        <tr key={label} class="data-table__row">
          <td class="data-table__td analytics__by-label">{label}</td>
          <td class="data-table__td analytics__by-value">{val}{unit}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const MilestoneBar: FC<
  { name: string; done: number; total: number; progress: number }
> = (
  { name, done, total, progress },
) => (
  <div class="analytics__milestone-row">
    <div class="analytics__milestone-meta">
      <span class="analytics__milestone-name">{name}</span>
      <span class="analytics__milestone-count">{done}/{total}</span>
    </div>
    <progress class="progress-bar" value={progress} max={100} />
  </div>
);

// ── filter bar ────────────────────────────────────────────────────────────────

const FilterBar: FC<{
  filters: AnalyticsFilters;
  customers: FilterOption[];
  projects: FilterOption[];
  people: FilterOption[];
}> = ({ filters, customers, projects, people }) => (
  <form
    id="analytics-filters"
    class="analytics__filter-bar"
    hx-get="/analytics"
    hx-push-url="true"
    hx-target="#analytics-content"
    hx-swap="outerHTML"
    hx-indicator="#global-loading"
    hx-trigger="change from:select, change from:input[type=date]"
  >
    <div class="analytics__filter-group">
      <label class="analytics__filter-label" for="af-customer">Customer</label>
      <select id="af-customer" name="customer" class="analytics__filter-select">
        <option value="">All customers</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id} selected={filters.customer === c.id}>
            {c.label}
          </option>
        ))}
      </select>
    </div>

    <div class="analytics__filter-group">
      <label class="analytics__filter-label" for="af-project">Project</label>
      <select id="af-project" name="project" class="analytics__filter-select">
        <option value="">All projects</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id} selected={filters.project === p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </div>

    <div class="analytics__filter-group">
      <label class="analytics__filter-label" for="af-person">Person</label>
      <select id="af-person" name="person" class="analytics__filter-select">
        <option value="">All people</option>
        {people.map((p) => (
          <option key={p.id} value={p.id} selected={filters.person === p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </div>

    <div class="analytics__filter-group">
      <label class="analytics__filter-label" for="af-from">From</label>
      <input
        id="af-from"
        type="date"
        name="from"
        value={filters.from ?? ""}
        class="analytics__filter-input"
      />
    </div>

    <div class="analytics__filter-group">
      <label class="analytics__filter-label" for="af-to">To</label>
      <input
        id="af-to"
        type="date"
        name="to"
        value={filters.to ?? ""}
        class="analytics__filter-input"
      />
    </div>

    {(filters.customer || filters.project || filters.person || filters.from ||
      filters.to) && (
      <a
        href="/analytics"
        class="btn btn--sm btn--ghost analytics__filter-clear"
      >
        Clear filters
      </a>
    )}
  </form>
);

// ── section spec (data-driven) ────────────────────────────────────────────────
// The 16 per-domain sections share one canonical shape: header → stat grid →
// chart-or-EmptyState → optional drill-downs. Rather than hand-write that
// scaffolding 16×, each section is described by a SectionSpec and rendered by a
// single <AnalyticsSection>. Bespoke bodies (milestones, capacity, habits,
// journal) and the per-section drill-downs stay as render closures referenced
// from the spec — they don't force into the chart slot. Section order, ids,
// `data-cat`, and `--wide` are preserved exactly so the CSS-only tabs and jump
// anchors keep working.

type StatProps = { label: string; value: string | number };

type SectionSpec = {
  key: string;
  title: string;
  cat: string;
  wide?: boolean;
  addLabel: string;
  addRoute: string;
  stats: (d: AnalyticsData) => StatProps[];
  hasData?: (d: AnalyticsData) => boolean;
  emptyMessage?: string;
  body?: (d: AnalyticsData) => Child;
  drilldowns?: (d: AnalyticsData) => Child;
};

const SECTIONS: SectionSpec[] = [
  {
    key: "tasks",
    title: "Tasks",
    cat: "delivery",
    addLabel: "Add Task",
    addRoute: "/tasks/new",
    stats: (d) => [
      { label: "Total", value: d.tasks.total },
      ...Object.entries(d.tasks.bySection).map(([sec, count]) => ({
        label: sec,
        value: count,
      })),
    ],
    hasData: (d) => d.tasks.total > 0,
    emptyMessage: "No tasks yet.",
    body: (d) => (
      <AnalyticsChart
        kind="bar"
        ariaLabel="Tasks by priority"
        items={Object.entries(d.tasks.byPriority)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([k, v]) => ({
            label: TASK_PRIORITY_LABELS[k] ?? `P${k}`,
            value: v,
          }))}
      />
    ),
    drilldowns: (d) => (
      <div class="analytics__row">
        {Object.keys(d.tasks.byProject).length > 0 && (
          <details class="analytics__details">
            <summary class="analytics__details-summary">By Project</summary>
            <ByTable
              rows={Object.entries(d.tasks.byProject)
                .sort(([, a], [, b]) => b - a)
                .map(([k, v]) => [k, v])}
            />
          </details>
        )}
      </div>
    ),
  },
  {
    key: "goals",
    title: "Goals",
    cat: "delivery",
    addLabel: "Add Goal",
    addRoute: "/goals/new",
    stats: (d) => [{ label: "Total", value: d.goals.total }],
    hasData: (d) => d.goals.total > 0,
    emptyMessage: "No goals yet.",
    body: (d) => (
      <AnalyticsChart
        kind="bar"
        ariaLabel="Goals by status"
        items={Object.entries(d.goals.byStatus)
          .sort(([, a], [, b]) => b - a)
          .map(([k, v]) => ({ label: capitalize(k), value: v }))}
      />
    ),
    drilldowns: (d) => (
      <div class="analytics__row">
        {Object.keys(d.goals.byType).length > 0 && (
          <details class="analytics__details">
            <summary class="analytics__details-summary">By Type</summary>
            <ByTable
              rows={Object.entries(d.goals.byType).map((
                [k, v],
              ) => [capitalize(k), v])}
            />
          </details>
        )}
      </div>
    ),
  },
  {
    key: "milestones",
    title: "Milestones",
    cat: "delivery",
    wide: true,
    addLabel: "Add Milestone",
    addRoute: "/milestones/new",
    stats: (d) => [{ label: "Total", value: d.milestones.total }],
    hasData: (d) => d.milestones.total > 0,
    emptyMessage: "No milestones yet.",
    body: (d) => (
      <div class="analytics__milestones analytics__progress-scroll">
        {[...d.milestones.milestones]
          .sort((a, b) =>
            b.progress - a.progress || a.name.localeCompare(b.name)
          )
          .map((m) => (
            <MilestoneBar
              key={m.id}
              name={m.name}
              done={m.doneCount}
              total={m.taskCount}
              progress={m.progress}
            />
          ))}
      </div>
    ),
    drilldowns: (d) =>
      d.milestones.total > 0 && (
        <details class="analytics__details">
          <summary class="analytics__details-summary">
            {d.milestones.total} milestone{d.milestones.total !== 1 ? "s" : ""}
          </summary>
          <div class="analytics__milestones">
            {d.milestones.milestones.map((m) => (
              <MilestoneBar
                key={m.id}
                name={m.name}
                done={m.doneCount}
                total={m.taskCount}
                progress={m.progress}
              />
            ))}
          </div>
        </details>
      ),
  },
  {
    key: "timeEntries",
    title: "Time Tracking",
    cat: "delivery",
    wide: true,
    addLabel: "Log Time",
    addRoute: "/tasks/new",
    stats: (d) => [
      { label: "Total Hours", value: `${d.timeEntries.totalHours}h` },
      { label: "Entries", value: d.timeEntries.entryCount },
    ],
    hasData: (d) => d.timeEntries.totalHours > 0,
    emptyMessage: "No time logged yet.",
    body: (d) => (
      <AnalyticsChart
        kind="line"
        ariaLabel="Hours logged per day, last 30 days"
        items={d.timeEntries.hoursPerDay.map((x) => ({
          label: x.date.slice(5).replace("-", "/"),
          value: x.hours,
          display: `${x.hours}h`,
        }))}
      />
    ),
    drilldowns: (d) => (
      <div class="analytics__row">
        {Object.keys(d.timeEntries.byPerson).length > 0 && (
          <details class="analytics__details">
            <summary class="analytics__details-summary">By Person</summary>
            <ByTable
              rows={Object.entries(d.timeEntries.byPerson)
                .sort(([, a], [, b]) => b - a)
                .map(([k, v]) => [k, `${v}h`])}
            />
          </details>
        )}
        {Object.keys(d.timeEntries.byProject).length > 0 && (
          <details class="analytics__details">
            <summary class="analytics__details-summary">By Project</summary>
            <ByTable
              rows={Object.entries(d.timeEntries.byProject)
                .sort(([, a], [, b]) => b - a)
                .map(([k, v]) => [k, `${v}h`])}
            />
          </details>
        )}
      </div>
    ),
  },
  {
    key: "capacity",
    title: "Capacity Plans",
    cat: "delivery",
    wide: true,
    addLabel: "Add Plan",
    addRoute: "/capacity-plans/new",
    stats: (d) => [{ label: "Plans", value: d.capacity.plans.length }],
    hasData: (d) => d.capacity.plans.length > 0,
    emptyMessage: "No capacity plans yet.",
    body: (d) => (
      <div class="analytics__util-chart">
        {[...d.capacity.plans]
          .sort((a, b) => (b.utilizationPct ?? -1) - (a.utilizationPct ?? -1))
          .map((p) => (
            <div
              key={p.id}
              class={`analytics__util-chart-row analytics__util-chart-row--${
                utilizationBand(p.utilizationPct)
              }`}
            >
              <a
                class="analytics__util-chart-name"
                href={`/capacity-plans/${p.id}`}
              >
                {p.name}
              </a>
              <progress
                class="progress-bar analytics__util-chart-bar"
                value={p.utilizationPct != null
                  ? Math.min(p.utilizationPct, 100)
                  : 0}
                max={100}
              />
              <span class="analytics__util-chart-value">
                {pct(p.utilizationPct)}
              </span>
            </div>
          ))}
      </div>
    ),
    drilldowns: (d) =>
      d.capacity.plans.length > 0 && (
        <details class="analytics__details">
          <summary class="analytics__details-summary">Details</summary>
          <table class="data-table analytics__capacity-table">
            <thead>
              <tr class="data-table__th-row">
                <th class="data-table__th">Plan</th>
                <th class="data-table__th">Budget (h)</th>
                <th class="data-table__th">Allocated (h)</th>
                <th class="data-table__th">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {d.capacity.plans.map((p) => (
                <tr key={p.id} class="data-table__row">
                  <td class="data-table__td">
                    <a href={`/capacity-plans/${p.id}`}>{p.name}</a>
                  </td>
                  <td class="data-table__td">{p.budgetHours ?? "—"}</td>
                  <td class="data-table__td">{p.allocatedHours}h</td>
                  <td class="data-table__td analytics__utilization">
                    <div class="analytics__util-row">
                      <span>{pct(p.utilizationPct)}</span>
                      {p.utilizationPct != null && (
                        <progress
                          class="progress-bar analytics__util-bar"
                          value={Math.min(p.utilizationPct, 100)}
                          max={100}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ),
  },
  {
    key: "invoices",
    title: "Invoices",
    cat: "revenue",
    wide: true,
    addLabel: "Add Invoice",
    addRoute: "/invoices/new",
    stats: (d) => [
      { label: "Total", value: d.invoices.total },
      {
        label: "Revenue",
        value: formatCurrency(d.invoices.totalAmount, { decimals: 2 }),
      },
    ],
    hasData: (d) => d.invoices.total > 0,
    emptyMessage: "No invoices yet.",
    body: (d) => (
      <AnalyticsChart
        kind="line"
        ariaLabel="Monthly revenue, last 12 months"
        items={d.invoices.revenueByMonth.map((x) => ({
          label: `${x.month.slice(5)}/${x.month.slice(2, 4)}`,
          value: x.amount,
          display: formatCurrency(x.amount, { decimals: 2 }),
        }))}
      />
    ),
    drilldowns: (d) =>
      Object.keys(d.invoices.byStatus).length > 0 && (
        <details class="analytics__details">
          <summary class="analytics__details-summary">By Status</summary>
          <ByTable
            rows={Object.entries(d.invoices.byStatus).map((
              [s, count],
            ) => [
              capitalize(s),
              `${count} (${
                formatCurrency(d.invoices.amountByStatus[s] ?? 0, {
                  decimals: 2,
                })
              })`,
            ])}
          />
        </details>
      ),
  },
  {
    key: "quotes",
    title: "Quotes",
    cat: "revenue",
    addLabel: "Add Quote",
    addRoute: "/quotes/new",
    stats: (d) => [
      { label: "Total", value: d.quotes.total },
      {
        label: "Pipeline",
        value: formatCurrency(d.quotes.totalAmount, { decimals: 2 }),
      },
    ],
    hasData: (d) => d.quotes.total > 0,
    emptyMessage: "No quotes yet.",
    body: (d) => (
      <AnalyticsChart
        kind="donut"
        ariaLabel="Quotes by stage"
        items={Object.entries(d.quotes.byStatus).map((
          [s, count],
        ) => ({ label: capitalize(s), value: count }))}
      />
    ),
    drilldowns: (d) =>
      Object.keys(d.quotes.byStatus).length > 0 && (
        <details class="analytics__details">
          <summary class="analytics__details-summary">By Status</summary>
          <ByTable
            rows={Object.entries(d.quotes.byStatus).map(([s, count]) => [
              capitalize(s),
              `${count} (${
                formatCurrency(d.quotes.amountByStatus[s] ?? 0, {
                  decimals: 2,
                })
              })`,
            ])}
          />
        </details>
      ),
  },
  {
    key: "meetings",
    title: "Meetings",
    cat: "crm",
    addLabel: "Add Meeting",
    addRoute: "/meetings/new",
    stats: (d) => [{ label: "Total", value: d.meetings.total }],
    hasData: (d) => d.meetings.total > 0,
    emptyMessage: "No meetings yet.",
    body: (d) => (
      <AnalyticsChart
        kind="bar"
        ariaLabel="Meetings per week, last 12 weeks"
        items={d.meetings.byWeek.map((x) => ({
          label: `${x.weekStart.slice(5).replace("-", "/")}`,
          value: x.count,
        }))}
      />
    ),
    drilldowns: (d) =>
      Object.keys(d.meetings.byProject).length > 0 && (
        <details class="analytics__details">
          <summary class="analytics__details-summary">By Project</summary>
          <ByTable rows={Object.entries(d.meetings.byProject)} />
        </details>
      ),
  },
  {
    key: "customers",
    title: "Customers",
    cat: "crm",
    addLabel: "Add Customer",
    addRoute: "/customers/new",
    stats: (d) => [{ label: "Total", value: d.customers.total }],
  },
  {
    key: "notes",
    title: "Notes",
    cat: "knowledge",
    addLabel: "Add Note",
    addRoute: "/notes/new",
    stats: (d) => [{ label: "Total", value: d.notes.total }],
    hasData: (d) => d.notes.total > 0,
    emptyMessage: "No notes yet.",
    body: (d) => (
      <AnalyticsChart
        kind="donut"
        ariaLabel="Notes by type"
        items={Object.entries(d.notes.byType)
          .sort(([, a], [, b]) => b - a)
          .map(([k, v]) => ({ label: capitalize(k), value: v }))}
      />
    ),
    drilldowns: (d) => (
      <div class="analytics__row">
        {Object.keys(d.notes.byProject).length > 0 && (
          <details class="analytics__details">
            <summary class="analytics__details-summary">By Project</summary>
            <ByTable
              rows={Object.entries(d.notes.byProject)
                .sort(([, a], [, b]) => b - a)
                .map(([k, v]) => [k, v])}
            />
          </details>
        )}
      </div>
    ),
  },
  {
    key: "investors",
    title: "Investors",
    cat: "revenue",
    addLabel: "Add Investor",
    addRoute: "/investors/new",
    stats: (d) => [
      { label: "Total", value: d.investors.total },
      {
        label: "Target Amount",
        value: formatCurrency(d.investors.totalTargetAmount, {
          decimals: 2,
        }),
      },
    ],
    hasData: (d) => d.investors.total > 0,
    emptyMessage: "No investors yet.",
    body: (d) => (
      <AnalyticsChart
        kind="bar"
        ariaLabel="Target amount by status"
        items={Object.entries(d.investors.targetAmountByStatus)
          .sort(([, a], [, b]) => b - a)
          .map(([k, v]) => ({
            label: capitalize(k),
            value: v,
            display: formatCurrency(v, { decimals: 2 }),
          }))}
      />
    ),
    drilldowns: (d) =>
      Object.keys(d.investors.byStatus).length > 0 && (
        <details class="analytics__details">
          <summary class="analytics__details-summary">By Status</summary>
          <ByTable
            rows={Object.entries(d.investors.byStatus).map(([k, v]) => [
              capitalize(k),
              v,
            ])}
          />
        </details>
      ),
  },
  {
    key: "finances",
    title: "Finances",
    cat: "revenue",
    wide: true,
    addLabel: "Add Entry",
    addRoute: "/finances/new",
    stats: (d) => [
      {
        label: "Income",
        value: formatCurrency(d.finances.totalIncome, { decimals: 2 }),
      },
      {
        label: "Expenses",
        value: formatCurrency(d.finances.totalExpenses, { decimals: 2 }),
      },
      {
        label: "Balance",
        value: formatCurrency(d.finances.balance, { decimals: 2 }),
      },
    ],
    hasData: (d) => d.finances.totalIncome + d.finances.totalExpenses > 0,
    emptyMessage: "No finance entries yet.",
    body: (d) => (
      <AnalyticsChart
        kind="groupedbar"
        ariaLabel="Income vs expenses, last 6 months"
        items={d.finances.byMonth.map((x) => ({
          label: `${x.month.slice(5)}/${x.month.slice(2, 4)}`,
          values: [x.income, x.expenses],
          displays: [
            formatCurrency(x.income, { decimals: 2 }),
            formatCurrency(x.expenses, { decimals: 2 }),
          ],
        }))}
      />
    ),
    drilldowns: (d) =>
      Object.keys(d.finances.byType).length > 0 && (
        <details class="analytics__details">
          <summary class="analytics__details-summary">By Type</summary>
          <ByTable
            rows={Object.entries(d.finances.byType).map(([k, v]) => [
              capitalize(k),
              v,
            ])}
          />
        </details>
      ),
  },
  {
    key: "deals",
    title: "Deals",
    cat: "revenue",
    addLabel: "Add Deal",
    addRoute: "/deals/new",
    stats: (d) => [
      { label: "Total", value: d.deals.total },
      {
        label: "Pipeline Value",
        value: formatCurrency(d.deals.totalValue, { decimals: 2 }),
      },
    ],
    hasData: (d) => d.deals.total > 0,
    emptyMessage: "No deals yet.",
    body: (d) => (
      <AnalyticsChart
        kind="funnel"
        ariaLabel="Deals by stage"
        items={DEAL_STAGES.map((stage) => ({
          label: DEAL_STAGE_LABELS[stage],
          value: d.deals.byStage[stage] ?? 0,
        }))}
      />
    ),
  },
  {
    key: "habits",
    title: "Habits",
    cat: "personal",
    wide: true,
    addLabel: "Add Habit",
    addRoute: "/habits/new",
    stats: (d) => [
      { label: "Total", value: d.habits.total },
      {
        label: "Completion (this month)",
        value: d.habits.completionRateThisMonth != null
          ? `${d.habits.completionRateThisMonth}%`
          : "—",
      },
    ],
    hasData: (d) => d.habits.total > 0,
    emptyMessage: "No habits yet.",
    body: (d) => (
      <div class="analytics__habit-grid">
        {d.habits.currentMonth.map((h) => (
          <div class="analytics__habit-row" key={h.habitId}>
            <span class="analytics__habit-name">{h.habitName}</span>
            <div class="analytics__habit-cells">
              {h.completions.map((done, i) => (
                <span
                  key={i}
                  class={`analytics__habit-cell${done ? " is-done" : ""}`}
                  title={`Day ${i + 1}${done ? " — done" : ""}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: "journal",
    title: "Journal",
    cat: "personal",
    wide: true,
    addLabel: "Add Entry",
    addRoute: "/journal/new",
    stats: (d) => [
      { label: "Total Entries", value: d.journal.total },
      { label: "This Month", value: d.journal.thisMonth },
      { label: "This Week", value: d.journal.thisWeek },
      { label: "Current Streak", value: `${d.journal.streak}d` },
    ],
    hasData: (d) => d.journal.total > 0,
    emptyMessage: "No journal entries yet.",
    body: (d) => (
      <div class="analytics__heatmap">
        {d.journal.last90Days.map((x) => {
          const lvl = x.count === 0
            ? 0
            : x.count === 1
            ? 1
            : x.count === 2
            ? 2
            : 3;
          return (
            <span
              key={x.date}
              class={`analytics__heat analytics__heat--${lvl}`}
              title={`${x.date}: ${x.count}`}
            />
          );
        })}
      </div>
    ),
  },
  {
    key: "reflections",
    title: "Reflections",
    cat: "personal",
    addLabel: "Add Reflection",
    addRoute: "/reflections/new",
    stats: (d) => [
      { label: "Total", value: d.reflections.total },
      { label: "This Month", value: d.reflections.thisMonth },
    ],
    hasData: (d) => d.reflections.total > 0,
    emptyMessage: "No reflections yet.",
    body: (d) => (
      <AnalyticsChart
        kind="bar"
        ariaLabel="Reflections per month, last 12 months"
        items={d.reflections.byMonth.map((x) => ({
          label: `${x.month.slice(5)}/${x.month.slice(2, 4)}`,
          value: x.count,
        }))}
      />
    ),
  },
];

const AnalyticsSection: FC<{ spec: SectionSpec; data: AnalyticsData }> = (
  { spec, data },
) => (
  <section
    class={`analytics__section${spec.wide ? " analytics__section--wide" : ""}`}
    id={`analytics-${spec.key}`}
    data-jump-target={spec.key}
    data-cat={spec.cat}
  >
    <SectionHeader
      title={spec.title}
      sectionKey={spec.key}
      addLabel={spec.addLabel}
      addRoute={spec.addRoute}
    />
    <div class="analytics__stat-grid">
      {spec.stats(data).map((s) => (
        <StatCard key={s.label} label={s.label} value={s.value} />
      ))}
    </div>
    {spec.body &&
      (spec.hasData!(data)
        ? spec.body(data)
        : <EmptyState message={spec.emptyMessage!} />)}
    {spec.drilldowns?.(data)}
  </section>
);

// ── inner content (partial for htmx, full for SSR) ───────────────────────────

type BodyProps = Omit<AnalyticsViewProps, keyof ViewProps>;

export const AnalyticsBody: FC<BodyProps> = (props) => {
  const { data, customers, projects, people, hiddenSections } = props;
  const { filters } = data;
  const visible = (key: string) => !hiddenSections.includes(key);

  return (
    <main class="analytics" id="analytics-content">
      <div class="analytics__header">
        <h1 class="analytics__title">Analytics</h1>
        <span class="analytics__generated">
          Updated {formatDate(data.generatedAt, true)}
        </span>
        <CustomizePanel hiddenSections={hiddenSections} />
      </div>

      <GlobalKpiStrip data={data} />

      <FilterBar
        filters={filters}
        customers={customers}
        projects={projects}
        people={people}
      />

      <CategoryTabs hiddenSections={hiddenSections} />

      {SECTIONS.map((spec) =>
        visible(spec.key) && (
          <AnalyticsSection key={spec.key} spec={spec} data={data} />
        )
      )}
    </main>
  );
};

// ── full page view ────────────────────────────────────────────────────────────

export const AnalyticsView: FC<AnalyticsViewProps> = (props) => {
  const { data, customers, projects, people, hiddenSections, ...vp } = props;
  return (
    <MainLayout
      title="Analytics"
      {...vp}
      activePath="/analytics"
      styles={["/css/views/analytics.css"]}
      scripts={["/js/analytics-charts.js"]}
    >
      <div id="analytics-sidenav-container" />
      <AnalyticsBody
        data={data}
        customers={customers}
        projects={projects}
        people={people}
        hiddenSections={hiddenSections}
      />
    </MainLayout>
  );
};
