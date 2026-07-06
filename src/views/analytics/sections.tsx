// Analytics section registry (data-driven). The 16 per-domain sections share
// one canonical shape: header → stat grid → chart-or-EmptyState → optional
// drill-downs. Rather than hand-write that scaffolding 16×, each section is
// described by a SectionSpec and rendered by a single <AnalyticsSection>
// (analytics.tsx). Bespoke bodies (milestones, capacity, habits, journal) and
// the per-section drill-downs stay as render closures referenced from the spec —
// they don't force into the chart slot. Section order, ids, `data-cat`, and
// `--wide` are preserved exactly so the CSS-only tabs and jump anchors keep
// working.

import type { Child } from "hono/jsx";
import { formatCurrency } from "../../utils/format.ts";
import { utilizationBand } from "../../utils/utilization.ts";
import { DEAL_STAGE_LABELS, DEAL_STAGES } from "../../types/deal.types.ts";
import { TASK_PRIORITY_LABELS } from "../../domains/task/constants.tsx";
import type { AnalyticsData } from "../../types/analytics.types.ts";
import { AnalyticsChart, ByTable, MilestoneBar } from "./components.tsx";

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pct(n: number | null): string {
  return n != null ? `${n}%` : "—";
}

type StatProps = { label: string; value: string | number };

export type SectionSpec = {
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

export const SECTIONS: SectionSpec[] = [
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
                <th scope="col" class="data-table__th">Plan</th>
                <th scope="col" class="data-table__th">Budget (h)</th>
                <th scope="col" class="data-table__th">Allocated (h)</th>
                <th scope="col" class="data-table__th">Utilization</th>
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
