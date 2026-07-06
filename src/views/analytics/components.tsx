// Analytics presentational components — pure FCs consumed by the section specs
// (sections.tsx) and the page body (analytics.tsx). No data fetching, no specs:
// every value is passed in already-aggregated. This module is a leaf — it must
// not import sections.tsx or analytics.tsx (keeps the split cycle-free).

import type { FC } from "hono/jsx";
import { formatCurrency } from "../../utils/format.ts";
import type {
  AnalyticsData,
  AnalyticsFilters,
} from "../../types/analytics.types.ts";

/** Filter dropdown option (customer / project / person). */
export type FilterOption = { id: string; label: string };

export const SectionHeader: FC<{
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
    >
      + {addLabel}
    </button>
  </div>
);

export const StatCard: FC<{ label: string; value: string | number }> = (
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

export const GlobalKpiStrip: FC<{ data: AnalyticsData }> = ({ data }) => {
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

export const AnalyticsChart: FC<
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

export const ByTable: FC<{ rows: [string, number | string][]; unit?: string }> =
  (
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

export const MilestoneBar: FC<
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

export const FilterBar: FC<{
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
