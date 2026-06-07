// Marketing Plan view routes — factory-generated list + custom detail.
// Structured fields edit via the factory sidenav (GET/POST /:id/edit);
// `description` and `notes` edit in-place via "Edit Mode"
// (?editing=true, PUT /:id/description, PUT /:id/notes).

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { marketingPlanConfig } from "../../domains/marketing-plan/config.tsx";
import {
  getGoalService,
  getMarketingPlanService,
  getPeopleService,
} from "../../singletons/services.ts";
import { MarketingPlanDetailView } from "../marketing-plan-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { publish } from "../../singletons/event-bus.ts";
import type { Goal } from "../../types/goal.types.ts";

export const marketingPlansRouter = createDomainRoutes(marketingPlanConfig);

/** Render the detail page; `?editing=true` enables in-place content editing. */
async function renderDetail(c: AppContext, id: string) {
  const plan = await getMarketingPlanService().getById(id);
  if (!plan) return c.notFound();

  // Resolve linked goals for KPI display.
  const goals: Goal[] = [];
  if (plan.linkedGoals?.length) {
    const goalService = getGoalService();
    for (const goalId of plan.linkedGoals) {
      const goal = await goalService.getById(goalId);
      if (goal) goals.push(goal);
    }
  }

  // plan.responsible is id-backed (source:"people") — map id→name for display.
  const personById: Record<string, string> = {};
  if (plan.responsible) {
    for (const p of await getPeopleService().list()) personById[p.id] = p.name;
  }

  const editing = c.req.query("editing") === "true";

  return c.html(
    <MarketingPlanDetailView
      {...viewProps(c, "/marketing-plans")}
      item={plan}
      goals={goals}
      personById={personById}
      editing={editing}
    />,
  );
}

marketingPlansRouter.get(
  "/:id",
  (c: AppContext) => renderDetail(c, c.req.param("id")!),
);

// In-place description save (Edit Mode). Factory provides edit/delete routes.
marketingPlansRouter.put("/:id/description", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const description = String(body.description ?? "").trim() || undefined;
  await getMarketingPlanService().update(id, { description });
  publish("marketing-plan.updated");
  return renderDetail(c, id);
});

// In-place notes save (Edit Mode).
marketingPlansRouter.put("/:id/notes", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getMarketingPlanService().update(id, { notes });
  publish("marketing-plan.updated");
  return renderDetail(c, id);
});
