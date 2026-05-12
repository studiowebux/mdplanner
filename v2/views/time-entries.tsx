// Time entries list view — all time entries across all tasks.

import type { FC } from "hono/jsx";
import { MainLayout } from "../components/layout/main.tsx";
import type { ViewProps } from "../types/app.ts";
import type { TimeEntry } from "../types/task.types.ts";
import { formatDate } from "../utils/time.ts";

export type TimeEntryRow = TimeEntry & {
  taskId: string;
  taskTitle: string;
};

type Props = ViewProps & {
  rows: TimeEntryRow[];
  totalHours: number;
};

export const TimeEntriesView: FC<Props> = ({ rows, totalHours, ...vp }) => (
  <MainLayout
    title="Time Entries"
    {...vp}
    activePath="/time-entries"
    styles={["/css/views/time-entries.css"]}
  >
    <main class="time-entries">
      <div class="time-entries__header">
        <h1 class="time-entries__title">Time Entries</h1>
        {rows.length > 0 && (
          <span class="time-entries__total">{totalHours}h total</span>
        )}
      </div>

      {rows.length === 0
        ? (
          <p class="time-entries__empty">
            No time entries yet. Log time from a task detail page.
          </p>
        )
        : (
          <table class="data-table">
            <thead>
              <tr class="data-table__head-row">
                <th class="data-table__th">Date</th>
                <th class="data-table__th">Task</th>
                <th class="data-table__th">Hours</th>
                <th class="data-table__th">Person</th>
                <th class="data-table__th">Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} class="data-table__row">
                  <td class="data-table__td">{formatDate(r.date)}</td>
                  <td class="data-table__td">
                    <a href={`/tasks/${r.taskId}`}>{r.taskTitle}</a>
                  </td>
                  <td class="data-table__td time-entries__hours">{r.hours}h</td>
                  <td class="data-table__td">{r.person ?? "—"}</td>
                  <td class="data-table__td">{r.description ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </main>
  </MainLayout>
);
