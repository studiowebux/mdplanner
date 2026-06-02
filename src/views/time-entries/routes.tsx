// Time entries view routes — cross-task list with weekly/monthly recap.

import { Hono } from "hono";
import { getTaskService } from "../../singletons/services.ts";
import {
  buildRecap,
  isoMonth,
  isoWeek,
  type RecapView,
  TimeEntriesView,
  type TimeEntryRow,
} from "../time-entries.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import type { AppVariables } from "../../types/app.ts";

export const timeEntriesRouter = new Hono<{ Variables: AppVariables }>();

timeEntriesRouter.get("/", async (c) => {
  const view = (c.req.query("view") ?? "list") as RecapView;
  const filterProject = c.req.query("project") ?? "";
  const filterPerson = c.req.query("person") ?? "";

  const tasks = await getTaskService().list(
    filterProject ? { project: filterProject } : {},
  );

  let rows: TimeEntryRow[] = tasks
    .flatMap((t) =>
      (t.time_entries ?? []).map((e) => ({
        ...e,
        taskId: t.id,
        taskTitle: t.title,
        taskProject: t.project ?? "",
      }))
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  if (filterPerson) {
    rows = rows.filter((r) => r.person === filterPerson);
  }

  const totalHours = Math.round(
    rows.reduce((sum, r) => sum + r.hours, 0) * 100,
  ) / 100;

  const baseProps = {
    ...viewProps(c, "/time-entries"),
    view,
    filterProject,
    filterPerson,
    totalHours,
  };

  if (view === "weekly") {
    return c.html(
      <TimeEntriesView
        {...baseProps}
        recap={buildRecap(rows, isoWeek)}
      />,
    );
  }

  if (view === "monthly") {
    return c.html(
      <TimeEntriesView
        {...baseProps}
        recap={buildRecap(rows, isoMonth)}
      />,
    );
  }

  return c.html(
    <TimeEntriesView {...baseProps} rows={rows} />,
  );
});
