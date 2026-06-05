// Time entries list view — all time entries across all tasks.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import { SseRefresh } from "./components/sse-refresh.tsx";
import type { ViewProps } from "../types/app.ts";
import type { TimeEntry } from "../types/task.types.ts";
import { formatDate } from "../utils/time.ts";

export type TimeEntryRow = TimeEntry & {
  taskId: string;
  taskTitle: string;
  taskProject: string;
};

export type RecapView = "list" | "weekly" | "monthly";

// { period → { project → hours } }
export type RecapByProject = Map<string, Map<string, number>>;
// { period → { person → hours } }
export type RecapByPerson = Map<string, Map<string, number>>;

export type RecapData = {
  byProject: RecapByProject;
  byPerson: RecapByPerson;
  periods: string[];
};

type BaseProps = ViewProps & {
  view: RecapView;
  filterProject: string;
  filterPerson: string;
  totalHours: number;
};

type ListProps = BaseProps & { rows: TimeEntryRow[] };
type RecapProps = BaseProps & { recap: RecapData };
type Props = ListProps | RecapProps;

// ── helpers ──────────────────────────────────────────────────────────────────

function isoWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  // ISO week: Thursday in current week determines the year
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function isoMonth(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── sub-components ───────────────────────────────────────────────────────────

const ViewToggle: FC<{
  current: RecapView;
  filterProject: string;
  filterPerson: string;
}> = ({ current, filterProject, filterPerson }) => {
  const params = new URLSearchParams();
  if (filterProject) params.set("project", filterProject);
  if (filterPerson) params.set("person", filterPerson);

  const href = (v: RecapView) => {
    const p = new URLSearchParams(params);
    p.set("view", v);
    return `/time-entries?${p.toString()}`;
  };

  return (
    <div class="view-toggle">
      {(["list", "weekly", "monthly"] as RecapView[]).map((v) => (
        <a
          key={v}
          href={href(v)}
          class={`btn btn--secondary btn--sm${
            current === v ? " view-toggle__btn--active" : ""
          }`}
        >
          {v.charAt(0).toUpperCase() + v.slice(1)}
        </a>
      ))}
    </div>
  );
};

const RecapTable: FC<{
  label: string;
  periods: string[];
  groups: Map<string, Map<string, number>>;
}> = ({ label, periods, groups }) => {
  const keys = Array.from(groups.keys()).sort();
  return (
    <section class="time-entries__recap-section">
      <h2 class="time-entries__recap-heading">{label}</h2>
      <table class="data-table time-entries__recap-table">
        <thead>
          <tr class="data-table__th-row">
            <th class="data-table__th time-entries__recap-label">
              {label === "By Project" ? "Project" : "Person"}
            </th>
            {periods.map((p) => (
              <th key={p} class="data-table__th time-entries__recap-period">
                {p}
              </th>
            ))}
            <th class="data-table__th time-entries__recap-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const byPeriod = groups.get(key)!;
            const total = round2(
              Array.from(byPeriod.values()).reduce((s, h) => s + h, 0),
            );
            return (
              <tr key={key} class="data-table__row">
                <td class="data-table__td time-entries__recap-label">{key}</td>
                {periods.map((p) => (
                  <td key={p} class="data-table__td time-entries__recap-cell">
                    {byPeriod.has(p) ? `${round2(byPeriod.get(p)!)}h` : "—"}
                  </td>
                ))}
                <td class="data-table__td time-entries__recap-total-cell">
                  {total}h
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr class="time-entries__recap-footer">
            <td class="data-table__td time-entries__recap-label time-entries__recap-footer-label">
              Total
            </td>
            {periods.map((p) => {
              const sum = round2(
                Array.from(groups.values()).reduce(
                  (s, byPeriod) => s + (byPeriod.get(p) ?? 0),
                  0,
                ),
              );
              return (
                <td
                  key={p}
                  class="data-table__td time-entries__recap-cell time-entries__recap-footer-cell"
                >
                  {sum > 0 ? `${sum}h` : "—"}
                </td>
              );
            })}
            <td class="data-table__td time-entries__recap-total-cell time-entries__recap-footer-cell">
              {round2(
                Array.from(groups.values()).reduce(
                  (s, byPeriod) =>
                    s +
                    Array.from(byPeriod.values()).reduce((a, b) => a + b, 0),
                  0,
                ),
              )}h
            </td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
};

// ── main view ────────────────────────────────────────────────────────────────

export const TimeEntriesView: FC<Props> = (props) => {
  const { view, filterProject, filterPerson, totalHours, ...vp } = props;

  const refreshParams = new URLSearchParams();
  refreshParams.set("view", view);
  if (filterProject) refreshParams.set("project", filterProject);
  if (filterPerson) refreshParams.set("person", filterPerson);
  const refreshUrl = `/time-entries?${refreshParams.toString()}`;

  return (
    <MainLayout
      title="Time Entries"
      {...vp}
      activePath="/time-entries"
      styles={["/css/views/time-entries.css"]}
    >
      <main id="time-entries-main" class="time-entries">
        <div class="time-entries__header">
          <h1 class="time-entries__title">Time Entries</h1>
          {totalHours > 0 && (
            <span class="time-entries__total">{totalHours}h total</span>
          )}
          <div class="time-entries__controls">
            <ViewToggle
              current={view}
              filterProject={filterProject}
              filterPerson={filterPerson}
            />
          </div>
        </div>

        {view === "list" && "rows" in props && (
          props.rows.length === 0
            ? (
              <p class="time-entries__empty">
                No time entries yet. Log time from a task detail page.
              </p>
            )
            : (
              <table class="data-table">
                <thead>
                  <tr class="data-table__th-row">
                    <th class="data-table__th">Date</th>
                    <th class="data-table__th">Task</th>
                    <th class="data-table__th">Project</th>
                    <th class="data-table__th">Hours</th>
                    <th class="data-table__th">Person</th>
                    <th class="data-table__th">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {props.rows.map((r) => (
                    <tr key={r.id} class="data-table__row">
                      <td class="data-table__td">{formatDate(r.date)}</td>
                      <td class="data-table__td">
                        <a href={`/tasks/${r.taskId}`}>{r.taskTitle}</a>
                      </td>
                      <td class="data-table__td">{r.taskProject || "—"}</td>
                      <td class="data-table__td time-entries__hours">
                        {r.hours}h
                      </td>
                      <td class="data-table__td">{r.person ?? "—"}</td>
                      <td class="data-table__td">{r.description ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        )}

        {"recap" in props && props.recap.periods.length === 0 && (
          <p class="time-entries__empty">No time entries for this period.</p>
        )}

        {"recap" in props && props.recap.periods.length > 0 && (
          <div class="time-entries__recap">
            <RecapTable
              label="By Project"
              periods={props.recap.periods}
              groups={props.recap.byProject}
            />
            <RecapTable
              label="By Person"
              periods={props.recap.periods}
              groups={props.recap.byPerson}
            />
          </div>
        )}
      </main>
      {
        /* Sibling of <main>, inside MainLayout so it renders in <body> and
            htmx opens the /sse EventSource (outside MainLayout = after </html>,
            SSE never connects). */
      }
      <SseRefresh
        getUrl={refreshUrl}
        trigger="sse:task.updated"
        targetId="time-entries-main"
      />
    </MainLayout>
  );
};

// ── grouping helpers (used by route) ─────────────────────────────────────────

export function buildRecap(
  rows: TimeEntryRow[],
  periodFn: (date: string) => string,
): RecapData {
  const byProject: RecapByProject = new Map();
  const byPerson: RecapByPerson = new Map();
  const periodSet = new Set<string>();

  for (const r of rows) {
    const period = periodFn(r.date);
    periodSet.add(period);

    const project = r.taskProject || "(no project)";
    if (!byProject.has(project)) byProject.set(project, new Map());
    const pp = byProject.get(project)!;
    pp.set(period, (pp.get(period) ?? 0) + r.hours);

    const person = r.person ?? "(unassigned)";
    if (!byPerson.has(person)) byPerson.set(person, new Map());
    const bp = byPerson.get(person)!;
    bp.set(period, (bp.get(period) ?? 0) + r.hours);
  }

  const periods = Array.from(periodSet).sort();
  return { byProject, byPerson, periods };
}

export { isoMonth, isoWeek };
