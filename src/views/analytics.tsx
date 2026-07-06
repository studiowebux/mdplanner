// Analytics command center — cross-domain metrics, customer-centric filters,
// quick-add per section. Presentational FCs live in analytics/components.tsx;
// the 16 section specs in analytics/sections.tsx. This file owns the page shell
// (view/body), the section renderer, customize panel, and category tabs.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { EmptyState } from "../components/ui/empty-state.tsx";
import { formatDate } from "../utils/time.ts";

import type { ViewProps } from "../types/app.ts";
import type { AnalyticsData } from "../types/analytics.types.ts";

import { SECTIONS, type SectionSpec } from "./analytics/sections.tsx";
import {
  FilterBar,
  type FilterOption,
  GlobalKpiStrip,
  SectionHeader,
  StatCard,
} from "./analytics/components.tsx";

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
