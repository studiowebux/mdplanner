// Time entries view routes — cross-task list.

import { Hono } from "hono";
import { getTaskService } from "../../singletons/services.ts";
import { TimeEntriesView, type TimeEntryRow } from "../time-entries.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import type { AppVariables } from "../../types/app.ts";

export const timeEntriesRouter = new Hono<{ Variables: AppVariables }>();

timeEntriesRouter.get("/", async (c) => {
  const tasks = await getTaskService().list();

  const rows: TimeEntryRow[] = tasks
    .flatMap((t) =>
      (t.time_entries ?? []).map((e) => ({
        ...e,
        taskId: t.id,
        taskTitle: t.title,
      }))
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalHours = Math.round(
    rows.reduce((sum, r) => sum + r.hours, 0) * 100,
  ) / 100;

  return c.html(
    <TimeEntriesView
      {...viewProps(c, "/time-entries")}
      rows={rows}
      totalHours={totalHours}
    />,
  );
});
