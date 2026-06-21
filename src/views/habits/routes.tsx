// Habit view routes — factory-generated list + custom detail + htmx partials.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { habitConfig } from "../../domains/habit/config.tsx";
import { getHabitService } from "../../singletons/services.ts";
import { HabitDetailView } from "../habit-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { renderToString } from "hono/jsx/dom/server";
import { HabitHeatmap, HabitHeatmapRow } from "./components/habit-heatmap.tsx";
import { HabitStats } from "./components/habit-stats.tsx";
import { HabitCompletionLog } from "./components/habit-completion-log.tsx";
import { HabitCard } from "../components/habit-card.tsx";
import type { Habit } from "../../types/habit.types.ts";
import { resolveUserScope } from "../../utils/actor.ts";
import { currentMonthDays, todayKey } from "../../domains/habit/dates.ts";

export const habitRouter = createDomainRoutes(habitConfig);

// Heatmap fragment — the list view's heatmap lives in the page topSlot, OUTSIDE
// the SSE-refreshed `#habits-view` container, so creating/deleting a habit left
// it stale. A hidden SSE-refresh node (rendered in the topSlot) re-fetches this
// fragment on `habit.updated`/`habit.deleted` and morphs `#habits-heatmap`
// (create publishes `<prefix>.updated`, not `.created`, in BaseService).
// Registered before the custom `/:id` route so it is not captured as an id.
habitRouter.get("/heatmap", async (c) => {
  const scope = await resolveUserScope(c);
  const habits = await getHabitService().listForUser({}, scope);
  return c.html(
    <div id="habits-heatmap">
      <HabitHeatmap habits={habits} />
    </div>,
  );
});

/**
 * htmx fragment for a habit mutation: swaps the heatmap row and OOB-swaps the
 * detail-page stats + completion log so the UI stays fresh without a reload.
 * The HabitCard OOB keeps the list/tracker grid in sync.
 */
function habitFragment(habit: Habit): string {
  const today = todayKey();
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
