// Habit view routes — factory-generated list + custom detail + htmx partials.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { habitConfig } from "../../domains/habit/config.tsx";
import { getHabitService } from "../../singletons/services.ts";
import { HabitDetailView } from "../habit-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { renderToString } from "hono/jsx/dom/server";
import { HabitHeatmapRow } from "./components/habit-heatmap.tsx";
import { HabitCard } from "../components/habit-card.tsx";
import { publish } from "../../singletons/event-bus.ts";

export const habitRouter = createDomainRoutes(habitConfig);

async function renderDetail(c: AppContext, id: string) {
  const item = await getHabitService().getById(id);
  if (!item) return c.notFound();
  return c.html(
    <HabitDetailView {...viewProps(c, "/habits")} item={item} />,
  );
}

habitRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  return renderDetail(c, id);
});

habitRouter.post("/:id/toggle-date/:date", async (c) => {
  const id = c.req.param("id");
  const date = c.req.param("date");
  const body = await c.req.parseBody();
  const note = typeof body.note === "string" && body.note
    ? body.note
    : undefined;
  const habit = await getHabitService().toggleDate(id, date, note);
  if (!habit) return c.notFound();
  publish("habit.updated");
  const now = new Date();
  const today = now.toLocaleDateString("en-CA");
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, "0");
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return { date: `${year}-${mm}-${String(d).padStart(2, "0")}`, day: d };
  });
  return c.html(
    renderToString(<HabitHeatmapRow habit={habit} days={days} today={today} />),
    200,
  );
});

habitRouter.post("/:id/check-today", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const note = typeof body.note === "string" && body.note
    ? body.note
    : undefined;
  const habit = await getHabitService().checkToday(id, note);
  if (!habit) return c.notFound();
  publish("habit.updated");
  const now = new Date();
  const today = now.toLocaleDateString("en-CA");
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, "0");
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    return { date: `${year}-${mm}-${String(d).padStart(2, "0")}`, day: d };
  });
  const cardHtml = renderToString(<HabitCard item={habit} />);
  const rowHtml = renderToString(
    <HabitHeatmapRow habit={habit} days={days} today={today} />,
  ).replace(
    `id="hrow-${habit.id}"`,
    `id="hrow-${habit.id}" hx-swap-oob="outerHTML:#hrow-${habit.id}"`,
  );
  return c.html(cardHtml + rowHtml, 200);
});
