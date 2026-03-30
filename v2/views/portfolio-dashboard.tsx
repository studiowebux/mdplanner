// Portfolio Dashboard — one row per project, all key signals visible.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { ViewProps } from "../types/app.ts";
import type { PortfolioDashboardItem } from "../types/portfolio.types.ts";
import { SseRefresh } from "./components/sse-refresh.tsx";
import { DEFAULT_STALE_DAYS, MS_PER_DAY } from "../constants/mod.ts";

type Props = ViewProps & {
  items: PortfolioDashboardItem[];
  sectionMap: { abbrev: string; full: string }[];
  staleDays: number;
  q?: string;
  sort?: string;
  order?: string;
  filter?: string;
};

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

const DashboardTable: FC<{
  items: PortfolioDashboardItem[];
  sectionMap: { abbrev: string; full: string }[];
  staleDays: number;
  sort?: string;
  order?: string;
  q?: string;
  filter?: string;
}> = ({ items, sectionMap, staleDays, sort, order, q, filter }) => {
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
        hx-get={`/portfolio/dashboard/view?${params}`}
        hx-target="#dashboard-view"
        hx-swap="outerHTML swap:100ms"
      >
        {label}
      </th>
    );
  };

  return (
    <div id="dashboard-view" class="data-table-wrapper">
      <table class="data-table data-table--compact">
        <thead class="data-table__head">
          <tr>
            {sortHeader("name", "Project")}
            {sortHeader("status", "Status")}
            {sectionMap.map(({ abbrev, full }) => (
              <th class="data-table__th dashboard__th--count" title={full}>
                {abbrev}
              </th>
            ))}
            {sortHeader("lastActivity", "Activity")}
            <th class="data-table__th">Milestone</th>
            <th class="data-table__th">Commit</th>
            <th class="data-table__th dashboard__th--count">PRs</th>
            <th class="data-table__th dashboard__th--count">Issues</th>
            <th class="data-table__th dashboard__th--count">CI</th>
          </tr>
        </thead>
        <tbody class="data-table__body">
          {items.length === 0
            ? (
              <tr>
                <td
                  class="data-table__td empty-text"
                  colspan={6 + sectionMap.length + 4}
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
                <td class="data-table__td">
                  <a href={`/portfolio/${item.id}`} class="dashboard__link">
                    {item.name}
                  </a>
                </td>
                <td class="data-table__td">
                  <span class={`badge badge--${item.status}`}>
                    {item.status}
                  </span>
                </td>
                {sectionMap.map(({ abbrev }) => (
                  <td class="data-table__td dashboard__td--count">
                    {item.tasks[abbrev] ?? 0}
                  </td>
                ))}
                <td class="data-table__td dashboard__td--activity">
                  {relativeTime(item.lastActivity)}
                </td>
                <td class="data-table__td">
                  {item.milestone
                    ? (
                      <span class="dashboard__milestone">
                        {item.milestone.name}
                        <span class="dashboard__milestone-pct">
                          {item.milestone.completionPct}%
                        </span>
                      </span>
                    )
                    : <span class="text-muted">&mdash;</span>}
                </td>
                <td class="data-table__td dashboard__td--activity">
                  {item.github
                    ? relativeTime(item.github.lastCommitDate)
                    : <span class="text-muted">&mdash;</span>}
                </td>
                <td class="data-table__td dashboard__td--count">
                  {item.github?.openPrs ?? "\u2014"}
                </td>
                <td class="data-table__td dashboard__td--count">
                  {item.github?.openIssues ?? "\u2014"}
                </td>
                <td class="data-table__td dashboard__td--count">
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

export const PortfolioDashboardView: FC<Props> = (
  { items, sectionMap, staleDays, q, sort, order, filter, ...props },
) => (
  <MainLayout
    title="Portfolio Dashboard"
    {...props}
    styles={["/css/views/dashboard.css"]}
  >
    <SseRefresh
      getUrl="/portfolio/dashboard"
      trigger="sse:portfolio.created, sse:portfolio.updated, sse:portfolio.deleted"
      targetId="dashboard-root"
    />
    <main id="dashboard-root" class="dashboard">
      <div class="dashboard__toolbar">
        <input
          type="search"
          name="q"
          class="input input--sm dashboard__search"
          placeholder="Search projects..."
          value={q ?? ""}
          hx-get="/portfolio/dashboard/view"
          hx-target="#dashboard-view"
          hx-swap="outerHTML swap:100ms"
          hx-trigger="input changed delay:300ms, search"
          hx-include=".dashboard__filter"
        />
        <select
          name="filter"
          class="input input--sm dashboard__filter"
          hx-get="/portfolio/dashboard/view"
          hx-target="#dashboard-view"
          hx-swap="outerHTML swap:100ms"
          hx-include=".dashboard__search"
        >
          <option value="" selected={!filter}>All</option>
          <option value="active" selected={filter === "active"}>Active</option>
          <option value="stale" selected={filter === "stale"}>Stale</option>
        </select>
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
  </MainLayout>
);

export { DashboardTable };
