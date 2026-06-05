// Analytics command center — cross-domain metrics, customer-centric filters, quick-add per section.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import { TASK_PRIORITY_LABELS } from "../domains/task/constants.tsx";
import { DEAL_STAGE_LABELS, DEAL_STAGES } from "../types/deal.types.ts";
import { utilizationBand } from "../utils/utilization.ts";
import { formatDate } from "../utils/time.ts";

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

function formatCurrency(n: number): string {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

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
        hx-indicator="#analytics-loading"
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
        value={formatCurrency(data.invoices.totalAmount)}
      />
      <KpiCard
        label="Open Deals"
        value={formatCurrency(data.deals.totalValue)}
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
    hx-indicator="#analytics-loading"
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

      {/* Tasks */}
      {visible("tasks") && (
        <section
          class="analytics__section"
          id="analytics-tasks"
          data-jump-target="tasks"
          data-cat="delivery"
        >
          <SectionHeader
            title="Tasks"
            sectionKey="tasks"
            addLabel="Add Task"
            addRoute="/tasks/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.tasks.total} />
            {Object.entries(data.tasks.bySection).map(([sec, count]) => (
              <StatCard key={sec} label={sec} value={count} />
            ))}
          </div>
          {data.tasks.total > 0
            ? (
              <AnalyticsChart
                kind="bar"
                ariaLabel="Tasks by priority"
                items={Object.entries(data.tasks.byPriority)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([k, v]) => ({
                    label: TASK_PRIORITY_LABELS[k] ?? `P${k}`,
                    value: v,
                  }))}
              />
            )
            : <EmptyState message="No tasks yet." />}
          <div class="analytics__row">
            {Object.keys(data.tasks.byProject).length > 0 && (
              <details class="analytics__details">
                <summary class="analytics__details-summary">By Project</summary>
                <ByTable
                  rows={Object.entries(data.tasks.byProject)
                    .sort(([, a], [, b]) => b - a)
                    .map(([k, v]) => [k, v])}
                />
              </details>
            )}
          </div>
        </section>
      )}

      {/* Goals */}
      {visible("goals") && (
        <section
          class="analytics__section"
          id="analytics-goals"
          data-jump-target="goals"
          data-cat="delivery"
        >
          <SectionHeader
            title="Goals"
            sectionKey="goals"
            addLabel="Add Goal"
            addRoute="/goals/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.goals.total} />
          </div>
          {data.goals.total > 0
            ? (
              <AnalyticsChart
                kind="bar"
                ariaLabel="Goals by status"
                items={Object.entries(data.goals.byStatus)
                  .sort(([, a], [, b]) => b - a)
                  .map(([k, v]) => ({ label: capitalize(k), value: v }))}
              />
            )
            : <EmptyState message="No goals yet." />}
          <div class="analytics__row">
            {Object.keys(data.goals.byType).length > 0 && (
              <details class="analytics__details">
                <summary class="analytics__details-summary">By Type</summary>
                <ByTable
                  rows={Object.entries(data.goals.byType).map((
                    [k, v],
                  ) => [capitalize(k), v])}
                />
              </details>
            )}
          </div>
        </section>
      )}

      {/* Milestones */}
      {visible("milestones") && (
        <section
          class="analytics__section analytics__section--wide"
          id="analytics-milestones"
          data-jump-target="milestones"
          data-cat="delivery"
        >
          <SectionHeader
            title="Milestones"
            sectionKey="milestones"
            addLabel="Add Milestone"
            addRoute="/milestones/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.milestones.total} />
          </div>
          {data.milestones.total > 0
            ? (
              <div class="analytics__milestones analytics__progress-scroll">
                {[...data.milestones.milestones]
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
            )
            : <EmptyState message="No milestones yet." />}
          {data.milestones.total > 0 && (
            <details class="analytics__details">
              <summary class="analytics__details-summary">
                {data.milestones.total}{" "}
                milestone{data.milestones.total !== 1 ? "s" : ""}
              </summary>
              <div class="analytics__milestones">
                {data.milestones.milestones.map((m) => (
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
          )}
        </section>
      )}

      {/* Time Entries */}
      {visible("timeEntries") && (
        <section
          class="analytics__section analytics__section--wide"
          id="analytics-timeEntries"
          data-jump-target="timeEntries"
          data-cat="delivery"
        >
          <SectionHeader
            title="Time Tracking"
            sectionKey="timeEntries"
            addLabel="Log Time"
            addRoute="/tasks/new"
          />
          <div class="analytics__stat-grid">
            <StatCard
              label="Total Hours"
              value={`${data.timeEntries.totalHours}h`}
            />
            <StatCard label="Entries" value={data.timeEntries.entryCount} />
          </div>
          {data.timeEntries.totalHours > 0
            ? (
              <AnalyticsChart
                kind="line"
                ariaLabel="Hours logged per day, last 30 days"
                items={data.timeEntries.hoursPerDay.map((d) => ({
                  label: d.date.slice(5).replace("-", "/"),
                  value: d.hours,
                  display: `${d.hours}h`,
                }))}
              />
            )
            : <EmptyState message="No time logged yet." />}
          <div class="analytics__row">
            {Object.keys(data.timeEntries.byPerson).length > 0 && (
              <details class="analytics__details">
                <summary class="analytics__details-summary">By Person</summary>
                <ByTable
                  rows={Object.entries(data.timeEntries.byPerson)
                    .sort(([, a], [, b]) => b - a)
                    .map(([k, v]) => [k, `${v}h`])}
                />
              </details>
            )}
            {Object.keys(data.timeEntries.byProject).length > 0 && (
              <details class="analytics__details">
                <summary class="analytics__details-summary">By Project</summary>
                <ByTable
                  rows={Object.entries(data.timeEntries.byProject)
                    .sort(([, a], [, b]) => b - a)
                    .map(([k, v]) => [k, `${v}h`])}
                />
              </details>
            )}
          </div>
        </section>
      )}

      {/* Capacity */}
      {visible("capacity") && (
        <section
          class="analytics__section analytics__section--wide"
          id="analytics-capacity"
          data-jump-target="capacity"
          data-cat="delivery"
        >
          <SectionHeader
            title="Capacity Plans"
            sectionKey="capacity"
            addLabel="Add Plan"
            addRoute="/capacity-plans/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Plans" value={data.capacity.plans.length} />
          </div>
          {data.capacity.plans.length > 0
            ? (
              <div class="analytics__util-chart">
                {[...data.capacity.plans]
                  .sort((a, b) =>
                    (b.utilizationPct ?? -1) - (a.utilizationPct ?? -1)
                  )
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
            )
            : <EmptyState message="No capacity plans yet." />}
          {data.capacity.plans.length > 0 && (
            <details class="analytics__details">
              <summary class="analytics__details-summary">Details</summary>
              <table class="data-table analytics__capacity-table">
                <thead>
                  <tr class="data-table__head-row">
                    <th class="data-table__th">Plan</th>
                    <th class="data-table__th">Budget (h)</th>
                    <th class="data-table__th">Allocated (h)</th>
                    <th class="data-table__th">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {data.capacity.plans.map((p) => (
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
          )}
        </section>
      )}

      {/* Invoices */}
      {visible("invoices") && (
        <section
          class="analytics__section analytics__section--wide"
          id="analytics-invoices"
          data-jump-target="invoices"
          data-cat="revenue"
        >
          <SectionHeader
            title="Invoices"
            sectionKey="invoices"
            addLabel="Add Invoice"
            addRoute="/invoices/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.invoices.total} />
            <StatCard
              label="Revenue"
              value={formatCurrency(data.invoices.totalAmount)}
            />
          </div>
          {data.invoices.total > 0
            ? (
              <AnalyticsChart
                kind="line"
                ariaLabel="Monthly revenue, last 12 months"
                items={data.invoices.revenueByMonth.map((d) => ({
                  label: `${d.month.slice(5)}/${d.month.slice(2, 4)}`,
                  value: d.amount,
                  display: formatCurrency(d.amount),
                }))}
              />
            )
            : <EmptyState message="No invoices yet." />}
          {Object.keys(data.invoices.byStatus).length > 0 && (
            <details class="analytics__details">
              <summary class="analytics__details-summary">By Status</summary>
              <ByTable
                rows={Object.entries(data.invoices.byStatus).map((
                  [s, count],
                ) => [
                  capitalize(s),
                  `${count} (${
                    formatCurrency(data.invoices.amountByStatus[s] ?? 0)
                  })`,
                ])}
              />
            </details>
          )}
        </section>
      )}

      {/* Quotes */}
      {visible("quotes") && (
        <section
          class="analytics__section"
          id="analytics-quotes"
          data-jump-target="quotes"
          data-cat="revenue"
        >
          <SectionHeader
            title="Quotes"
            sectionKey="quotes"
            addLabel="Add Quote"
            addRoute="/quotes/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.quotes.total} />
            <StatCard
              label="Pipeline"
              value={formatCurrency(data.quotes.totalAmount)}
            />
          </div>
          {data.quotes.total > 0
            ? (
              <AnalyticsChart
                kind="donut"
                ariaLabel="Quotes by stage"
                items={Object.entries(data.quotes.byStatus).map((
                  [s, count],
                ) => ({ label: capitalize(s), value: count }))}
              />
            )
            : <EmptyState message="No quotes yet." />}
          {Object.keys(data.quotes.byStatus).length > 0 && (
            <details class="analytics__details">
              <summary class="analytics__details-summary">By Status</summary>
              <ByTable
                rows={Object.entries(data.quotes.byStatus).map(([s, count]) => [
                  capitalize(s),
                  `${count} (${
                    formatCurrency(data.quotes.amountByStatus[s] ?? 0)
                  })`,
                ])}
              />
            </details>
          )}
        </section>
      )}

      {/* Meetings */}
      {visible("meetings") && (
        <section
          class="analytics__section"
          id="analytics-meetings"
          data-jump-target="meetings"
          data-cat="crm"
        >
          <SectionHeader
            title="Meetings"
            sectionKey="meetings"
            addLabel="Add Meeting"
            addRoute="/meetings/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.meetings.total} />
          </div>
          {data.meetings.total > 0
            ? (
              <AnalyticsChart
                kind="bar"
                ariaLabel="Meetings per week, last 12 weeks"
                items={data.meetings.byWeek.map((d) => ({
                  label: `${d.weekStart.slice(5).replace("-", "/")}`,
                  value: d.count,
                }))}
              />
            )
            : <EmptyState message="No meetings yet." />}
          {Object.keys(data.meetings.byProject).length > 0 && (
            <details class="analytics__details">
              <summary class="analytics__details-summary">By Project</summary>
              <ByTable rows={Object.entries(data.meetings.byProject)} />
            </details>
          )}
        </section>
      )}

      {/* Customers */}
      {visible("customers") && (
        <section
          class="analytics__section"
          id="analytics-customers"
          data-jump-target="customers"
          data-cat="crm"
        >
          <SectionHeader
            title="Customers"
            sectionKey="customers"
            addLabel="Add Customer"
            addRoute="/customers/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.customers.total} />
          </div>
        </section>
      )}

      {/* Notes */}
      {visible("notes") && (
        <section
          class="analytics__section"
          id="analytics-notes"
          data-jump-target="notes"
          data-cat="knowledge"
        >
          <SectionHeader
            title="Notes"
            sectionKey="notes"
            addLabel="Add Note"
            addRoute="/notes/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.notes.total} />
          </div>
          {data.notes.total > 0
            ? (
              <AnalyticsChart
                kind="donut"
                ariaLabel="Notes by type"
                items={Object.entries(data.notes.byType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([k, v]) => ({ label: capitalize(k), value: v }))}
              />
            )
            : <EmptyState message="No notes yet." />}
          <div class="analytics__row">
            {Object.keys(data.notes.byProject).length > 0 && (
              <details class="analytics__details">
                <summary class="analytics__details-summary">By Project</summary>
                <ByTable
                  rows={Object.entries(data.notes.byProject)
                    .sort(([, a], [, b]) => b - a)
                    .map(([k, v]) => [k, v])}
                />
              </details>
            )}
          </div>
        </section>
      )}

      {/* Investors */}
      {visible("investors") && (
        <section
          class="analytics__section"
          id="analytics-investors"
          data-jump-target="investors"
          data-cat="revenue"
        >
          <SectionHeader
            title="Investors"
            sectionKey="investors"
            addLabel="Add Investor"
            addRoute="/investors/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.investors.total} />
            <StatCard
              label="Target Amount"
              value={formatCurrency(data.investors.totalTargetAmount)}
            />
          </div>
          {data.investors.total > 0
            ? (
              <AnalyticsChart
                kind="bar"
                ariaLabel="Target amount by status"
                items={Object.entries(data.investors.targetAmountByStatus)
                  .sort(([, a], [, b]) => b - a)
                  .map(([k, v]) => ({
                    label: capitalize(k),
                    value: v,
                    display: formatCurrency(v),
                  }))}
              />
            )
            : <EmptyState message="No investors yet." />}
          {Object.keys(data.investors.byStatus).length > 0 && (
            <details class="analytics__details">
              <summary class="analytics__details-summary">By Status</summary>
              <ByTable
                rows={Object.entries(data.investors.byStatus).map(([k, v]) => [
                  capitalize(k),
                  v,
                ])}
              />
            </details>
          )}
        </section>
      )}

      {/* Finances */}
      {visible("finances") && (
        <section
          class="analytics__section analytics__section--wide"
          id="analytics-finances"
          data-jump-target="finances"
          data-cat="revenue"
        >
          <SectionHeader
            title="Finances"
            sectionKey="finances"
            addLabel="Add Entry"
            addRoute="/finances/new"
          />
          <div class="analytics__stat-grid">
            <StatCard
              label="Income"
              value={formatCurrency(data.finances.totalIncome)}
            />
            <StatCard
              label="Expenses"
              value={formatCurrency(data.finances.totalExpenses)}
            />
            <StatCard
              label="Balance"
              value={formatCurrency(data.finances.balance)}
            />
          </div>
          {data.finances.totalIncome + data.finances.totalExpenses > 0
            ? (
              <AnalyticsChart
                kind="groupedbar"
                ariaLabel="Income vs expenses, last 6 months"
                items={data.finances.byMonth.map((d) => ({
                  label: `${d.month.slice(5)}/${d.month.slice(2, 4)}`,
                  values: [d.income, d.expenses],
                  displays: [
                    formatCurrency(d.income),
                    formatCurrency(d.expenses),
                  ],
                }))}
              />
            )
            : <EmptyState message="No finance entries yet." />}
          {Object.keys(data.finances.byType).length > 0 && (
            <details class="analytics__details">
              <summary class="analytics__details-summary">By Type</summary>
              <ByTable
                rows={Object.entries(data.finances.byType).map(([k, v]) => [
                  capitalize(k),
                  v,
                ])}
              />
            </details>
          )}
        </section>
      )}

      {/* Deals */}
      {visible("deals") && (
        <section
          class="analytics__section"
          id="analytics-deals"
          data-jump-target="deals"
          data-cat="revenue"
        >
          <SectionHeader
            title="Deals"
            sectionKey="deals"
            addLabel="Add Deal"
            addRoute="/deals/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.deals.total} />
            <StatCard
              label="Pipeline Value"
              value={formatCurrency(data.deals.totalValue)}
            />
          </div>
          {data.deals.total > 0
            ? (
              <AnalyticsChart
                kind="funnel"
                ariaLabel="Deals by stage"
                items={DEAL_STAGES.map((stage) => ({
                  label: DEAL_STAGE_LABELS[stage],
                  value: data.deals.byStage[stage] ?? 0,
                }))}
              />
            )
            : <EmptyState message="No deals yet." />}
        </section>
      )}

      {/* Habits */}
      {visible("habits") && (
        <section
          class="analytics__section analytics__section--wide"
          id="analytics-habits"
          data-jump-target="habits"
          data-cat="personal"
        >
          <SectionHeader
            title="Habits"
            sectionKey="habits"
            addLabel="Add Habit"
            addRoute="/habits/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.habits.total} />
            <StatCard
              label="Completion (this month)"
              value={data.habits.completionRateThisMonth != null
                ? `${data.habits.completionRateThisMonth}%`
                : "—"}
            />
          </div>
          {data.habits.total > 0
            ? (
              <div class="analytics__habit-grid">
                {data.habits.currentMonth.map((h) => (
                  <div class="analytics__habit-row" key={h.habitId}>
                    <span class="analytics__habit-name">{h.habitName}</span>
                    <div class="analytics__habit-cells">
                      {h.completions.map((done, i) => (
                        <span
                          key={i}
                          class={`analytics__habit-cell${
                            done ? " is-done" : ""
                          }`}
                          title={`Day ${i + 1}${done ? " — done" : ""}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
            : <EmptyState message="No habits yet." />}
        </section>
      )}

      {/* Journal */}
      {visible("journal") && (
        <section
          class="analytics__section analytics__section--wide"
          id="analytics-journal"
          data-jump-target="journal"
          data-cat="personal"
        >
          <SectionHeader
            title="Journal"
            sectionKey="journal"
            addLabel="Add Entry"
            addRoute="/journal/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total Entries" value={data.journal.total} />
            <StatCard label="This Month" value={data.journal.thisMonth} />
            <StatCard label="This Week" value={data.journal.thisWeek} />
            <StatCard
              label="Current Streak"
              value={`${data.journal.streak}d`}
            />
          </div>
          {data.journal.total > 0
            ? (
              <div class="analytics__heatmap">
                {data.journal.last90Days.map((d) => {
                  const lvl = d.count === 0
                    ? 0
                    : d.count === 1
                    ? 1
                    : d.count === 2
                    ? 2
                    : 3;
                  return (
                    <span
                      key={d.date}
                      class={`analytics__heat analytics__heat--${lvl}`}
                      title={`${d.date}: ${d.count}`}
                    />
                  );
                })}
              </div>
            )
            : <EmptyState message="No journal entries yet." />}
        </section>
      )}

      {/* Reflections */}
      {visible("reflections") && (
        <section
          class="analytics__section"
          id="analytics-reflections"
          data-jump-target="reflections"
          data-cat="personal"
        >
          <SectionHeader
            title="Reflections"
            sectionKey="reflections"
            addLabel="Add Reflection"
            addRoute="/reflections/new"
          />
          <div class="analytics__stat-grid">
            <StatCard label="Total" value={data.reflections.total} />
            <StatCard label="This Month" value={data.reflections.thisMonth} />
          </div>
          {data.reflections.total > 0
            ? (
              <AnalyticsChart
                kind="bar"
                ariaLabel="Reflections per month, last 12 months"
                items={data.reflections.byMonth.map((d) => ({
                  label: `${d.month.slice(5)}/${d.month.slice(2, 4)}`,
                  value: d.count,
                }))}
              />
            )
            : <EmptyState message="No reflections yet." />}
        </section>
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
      <div
        id="analytics-loading"
        class="analytics__loading"
        aria-hidden="true"
      />
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
