// Portfolio Dashboard — one row per project, all key signals visible.
// Uses shared domain-page, domain-toolbar, data-table patterns.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { ViewProps } from "../types/app.ts";
import type { PortfolioDashboardItem } from "../types/portfolio.types.ts";
import { MS_PER_DAY } from "../constants/mod.ts";
import { badgeClass } from "../components/ui/status-badge.tsx";
import { PORTFOLIO_STATUS_VARIANTS } from "../domains/portfolio/constants.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionEntry = { abbrev: string; full: string };

type ColumnDef = { key: string; label: string };

type TableProps = {
  items: PortfolioDashboardItem[];
  sectionMap: SectionEntry[];
  staleDays: number;
  sort?: string;
  order?: string;
  q?: string;
  filter?: string;
};

type Props = ViewProps & TableProps;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isStale(lastActivity: string | null, staleDays: number): boolean {
  if (!lastActivity) return true;
  const diff = Date.now() - new Date(lastActivity).getTime();
  return diff > staleDays * MS_PER_DAY;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "\u2014";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / MS_PER_DAY);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function buildColumns(sectionMap: SectionEntry[]): ColumnDef[] {
  return [
    { key: "name", label: "Project" },
    { key: "status", label: "Status" },
    ...sectionMap.map((s) => ({ key: `section_${s.abbrev}`, label: s.full })),
    { key: "activity", label: "Activity" },
    { key: "milestone", label: "Milestone" },
    { key: "commit", label: "Commit" },
    { key: "prs", label: "PRs" },
    { key: "issues", label: "Issues" },
    { key: "ci", label: "CI" },
  ];
}

// ---------------------------------------------------------------------------
// Column toggle — inline (same pattern as domain-view.tsx)
// ---------------------------------------------------------------------------

const DashboardColumnToggle: FC<{ columns: ColumnDef[] }> = ({ columns }) => {
  const toggleable = columns.filter((c) => c.key !== "name");
  return (
    <details
      id="dashboard-column-toggle"
      class="column-toggle"
      data-column-toggle="dashboard"
    >
      <summary class="btn btn--secondary btn--sm">Columns</summary>
      <div class="column-toggle__panel">
        {toggleable.map((col) => (
          <label key={col.key} class="column-toggle__item">
            <input type="checkbox" checked data-column-key={col.key} />
            {col.label}
          </label>
        ))}
      </div>
    </details>
  );
};

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

const DashboardTable: FC<TableProps> = (
  { items, sectionMap, staleDays, sort, order, q, filter },
) => {
  const columns = buildColumns(sectionMap);
  const nextOrder = (col: string) =>
    sort === col && order === "asc" ? "desc" : "asc";

  const sortHeader = (col: string, label: string) => {
    const isSorted = sort === col;
    const cls = [
      "data-table__th",
      "data-table__th--sortable",
      isSorted ? "data-table__th--sorted" : "",
      isSorted ? `data-table__th--${order ?? "asc"}` : "",
    ].filter(Boolean).join(" ");

    const params = new URLSearchParams();
    params.set("sort", col);
    params.set("order", nextOrder(col));
    if (q) params.set("q", q);
    if (filter) params.set("filter", filter);

    return (
      <th
        class={cls}
        data-col={col}
        hx-get={`/portfolio/dashboard/view?${params}`}
        hx-target="#dashboard-view"
        hx-swap="outerHTML swap:100ms"
        hx-include="#dashboard-toolbar"
      >
        {label}
      </th>
    );
  };

  const staticHeader = (col: string, label: string) => (
    <th class="data-table__th" data-col={col}>{label}</th>
  );

  return (
    <div id="dashboard-view" class="data-table-wrapper">
      <table class="data-table" data-column-table="dashboard">
        <thead class="data-table__head">
          <tr>
            {sortHeader("name", "Project")}
            {sortHeader("status", "Status")}
            {sectionMap.map(({ abbrev, full }) =>
              staticHeader(`section_${abbrev}`, abbrev)
            )}
            {sortHeader("activity", "Activity")}
            {staticHeader("milestone", "Milestone")}
            {staticHeader("commit", "Commit")}
            {staticHeader("prs", "PRs")}
            {staticHeader("issues", "Issues")}
            {staticHeader("ci", "CI")}
          </tr>
        </thead>
        <tbody class="data-table__body">
          {items.length === 0
            ? (
              <tr>
                <td
                  class="data-table__td empty-text"
                  colspan={columns.length}
                >
                  No portfolio items
                </td>
              </tr>
            )
            : items.map((item) => (
              <tr
                class={`data-table__row${
                  isStale(item.lastActivity, staleDays)
                    ? " dashboard__row--stale"
                    : ""
                }`}
              >
                <td class="data-table__td" data-col="name">
                  <a href={`/portfolio/${item.id}`}>{item.name}</a>
                </td>
                <td class="data-table__td" data-col="status">
                  <span
                    class={badgeClass(PORTFOLIO_STATUS_VARIANTS, item.status)}
                  >
                    {item.status}
                  </span>
                </td>
                {sectionMap.map(({ abbrev }) => (
                  <td
                    class="data-table__td"
                    data-col={`section_${abbrev}`}
                  >
                    {item.tasks[abbrev] ?? 0}
                  </td>
                ))}
                <td class="data-table__td" data-col="activity">
                  {relativeTime(item.lastActivity)}
                </td>
                <td class="data-table__td" data-col="milestone">
                  {item.milestone
                    ? (
                      <span>
                        {item.milestone.name}{" "}
                        <span class="text-muted">
                          {item.milestone.completionPct}%
                        </span>
                      </span>
                    )
                    : <span class="text-muted">&mdash;</span>}
                </td>
                <td class="data-table__td" data-col="commit">
                  {item.github
                    ? relativeTime(item.github.lastCommitDate)
                    : <span class="text-muted">&mdash;</span>}
                </td>
                <td class="data-table__td" data-col="prs">
                  {item.github?.openPrs ?? "\u2014"}
                </td>
                <td class="data-table__td" data-col="issues">
                  {item.github?.openIssues ?? "\u2014"}
                </td>
                <td class="data-table__td" data-col="ci">
                  {item.github?.ciSuccessRate != null
                    ? `${item.github.ciSuccessRate}%`
                    : "\u2014"}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export const PortfolioDashboardView: FC<Props> = (
  { items, sectionMap, staleDays, q, sort, order, filter, ...props },
) => {
  const columns = buildColumns(sectionMap);
  return (
    <MainLayout
      title="Portfolio Dashboard"
      {...props}
      styles={["/css/views/dashboard.css"]}
    >
      <main
        class="domain-page"
        data-domain="dashboard"
        hx-ext="sse"
        sse-connect="/sse"
        hx-get="/portfolio/dashboard/view"
        hx-trigger="sse:portfolio.created, sse:portfolio.updated, sse:portfolio.deleted"
        hx-target="#dashboard-view"
        hx-swap="outerHTML"
        hx-include="#dashboard-toolbar"
      >
        <header class="domain-page__header">
          <h1 class="domain-page__title">Dashboard</h1>
          <span class="domain-page__count">{items.length} projects</span>
        </header>

        <div id="dashboard-toolbar" class="domain-toolbar">
          <div class="domain-toolbar__left">
            <input
              type="search"
              class="domain-toolbar__search"
              name="q"
              value={q ?? ""}
              placeholder="Search projects..."
              aria-label="Search"
              hx-get="/portfolio/dashboard/view"
              hx-trigger="input changed delay:300ms, search"
              hx-target="#dashboard-view"
              hx-swap="outerHTML swap:100ms"
              hx-include="#dashboard-toolbar"
            />
            <select
              class="filter-bar__select"
              name="filter"
              hx-get="/portfolio/dashboard/view"
              hx-trigger="change"
              hx-target="#dashboard-view"
              hx-swap="outerHTML swap:100ms"
              hx-include="#dashboard-toolbar"
            >
              <option value="" selected={!filter}>All projects</option>
              <option value="active" selected={filter === "active"}>
                Active
              </option>
              <option value="stale" selected={filter === "stale"}>
                Stale
              </option>
            </select>
          </div>
          <div class="domain-toolbar__right">
            <DashboardColumnToggle columns={columns} />
          </div>
        </div>

        <DashboardTable
          items={items}
          sectionMap={sectionMap}
          staleDays={staleDays}
          sort={sort}
          order={order}
          q={q}
          filter={filter}
        />
      </main>
      <div id="dashboard-form-container" />
    </MainLayout>
  );
};

export { DashboardTable };
