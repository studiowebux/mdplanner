// Habit view routes — factory-generated list + custom detail + htmx partials.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { habitConfig } from "../../domains/habit/config.tsx";
import { getHabitService } from "../../singletons/services.ts";
import { HabitDetailView } from "../habit-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { renderToString } from "hono/jsx/dom/server";
import { HabitHeatmapRow } from "./components/habit-heatmap.tsx";
import { HabitStats } from "./components/habit-stats.tsx";
import { HabitCompletionLog } from "./components/habit-completion-log.tsx";
import { HabitCard } from "../components/habit-card.tsx";
import type { Habit } from "../../types/habit.types.ts";
import { resolveUserScope } from "../../utils/actor.ts";

export const habitRouter = createDomainRoutes(habitConfig);

/** Current-month day cells for the heatmap row. */
function currentMonthDays(): { date: string; day: number }[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, "0");
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return { date: `${year}-${mm}-${String(d).padStart(2, "0")}`, day: d };
  });
}

/**
 * htmx fragment for a habit mutation: swaps the heatmap row and OOB-swaps the
 * detail-page stats + completion log so the UI stays fresh without a reload.
 * The HabitCard OOB keeps the list/tracker grid in sync.
 */
function habitFragment(habit: Habit): string {
  const today = new Date().toLocaleDateString("en-CA");
  return renderToString(
    <>
      <HabitHeatmapRow habit={habit} days={currentMonthDays()} today={today} />
      <HabitStats habit={habit} oob />
      <HabitCompletionLog habit={habit} oob />
      <HabitCard item={habit} oobSwap="true" />
    </>,
  );
}

async function renderDetail(c: AppContext, id: string) {
  const scope = await resolveUserScope(c);
  const item = await getHabitService().getForUser(id, scope);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <HabitDetailView
      {...viewProps(c, "/habits")}
      item={item}
      editing={editing}
    />,
  );
}

habitRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  return renderDetail(c, id);
});

habitRouter.put("/:id/description", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const description = String(body.description ?? "").trim() || undefined;
  await getHabitService().update(id, { description });
  return renderDetail(c, id);
});

habitRouter.delete("/:id/completion/:date", async (c) => {
  const id = c.req.param("id");
  const date = c.req.param("date");
  const scope = await resolveUserScope(c);
  const habit = await getHabitService().deleteCompletion(id, date, scope);
  if (!habit) return c.notFound();
  return c.html(habitFragment(habit), 200);
});

habitRouter.post("/:id/toggle-date/:date", async (c) => {
  const id = c.req.param("id");
  const date = c.req.param("date");
  const body = await c.req.parseBody();
  const note = typeof body.note === "string" && body.note
    ? body.note
    : undefined;
  const scope = await resolveUserScope(c);
  const habit = await getHabitService().toggleDate(id, date, scope, note);
  if (!habit) return c.notFound();
  return c.html(habitFragment(habit), 200);
});
