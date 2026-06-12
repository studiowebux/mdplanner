// Goal view routes — factory-generated list/create/edit + custom detail route.
// Structured fields edit via the factory sidenav (GET/POST /:id/edit);
// `description` and `notes` edit in-place via "Edit Mode" (?editing=true,
// PUT /:id/description and PUT /:id/notes).

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { goalConfig } from "../../domains/goal/config.tsx";
import {
  getGoalService,
  getMilestoneService,
  getPeopleService,
  getPortfolioService,
} from "../../singletons/services.ts";
import { GoalDetailView } from "../goal-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const goalsRouter = createDomainRoutes(goalConfig);

async function renderDetail(c: AppContext, id: string) {
  const goal = await getGoalService().getById(id);
  if (!goal) return c.notFound();

  // Collect all people names to resolve to IDs
  const peopleNames = new Set<string>();
  if (goal.owner) peopleNames.add(goal.owner);
  for (const c2 of goal.contributors ?? []) peopleNames.add(c2);

  const [portfolioItems, parentGoal, linkedMilestones, childGoals, allPeople] =
    await Promise.all([
      goal.linkedPortfolioItems?.length
        ? getPortfolioService().list()
        : Promise.resolve([]),
      goal.parentGoal
        ? getGoalService().getById(goal.parentGoal)
        : Promise.resolve(null),
      goal.linkedMilestones?.length
        ? getMilestoneService().list().then((all) =>
          all.filter((m) => (goal.linkedMilestones ?? []).includes(m.id))
        )
        : Promise.resolve([]),
      getGoalService().list().then((all) =>
        all.filter((g) => g.parentGoal === goal.id)
      ),
      peopleNames.size > 0 ? getPeopleService().list() : Promise.resolve([]),
    ]);

  // Build name → person ID lookup, plus an ID → name lookup so id-backed
  // owner/contributor fields (source:"people") resolve to a display name.
  const personByName: Record<string, string> = {};
  const personById: Record<string, string> = {};
  for (const p of allPeople) {
    if (peopleNames.has(p.name)) {
      personByName[p.name] = p.id;
    }
    personById[p.id] = p.name;
  }

  const editing = c.req.query("editing") === "true";

  return c.html(
    <GoalDetailView
      {...viewProps(c, "/goals")}
      item={goal}
      portfolioItems={portfolioItems}
      parentGoal={parentGoal}
      linkedMilestones={linkedMilestones}
      childGoals={childGoals}
      personByName={personByName}
      personById={personById}
      editing={editing}
    />,
  );
}

goalsRouter.get(
  "/:id",
  (c: AppContext) => renderDetail(c, c.req.param("id")!),
);

goalsRouter.put("/:id/description", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const description = String(body.description ?? "").trim() || undefined;
  await getGoalService().update(id, { description });
  return renderDetail(c, id);
});

goalsRouter.put("/:id/notes", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getGoalService().update(id, { notes });
  return renderDetail(c, id);
});
