// Goal view routes — factory-generated list/create/edit + custom detail route.

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

goalsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
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
          all.filter((m) => goal.linkedMilestones!.includes(m.id))
        )
        : Promise.resolve([]),
      getGoalService().list().then((all) =>
        all.filter((g) => g.parentGoal === goal.id)
      ),
      peopleNames.size > 0 ? getPeopleService().list() : Promise.resolve([]),
    ]);

  // Build name → person ID lookup
  const personByName: Record<string, string> = {};
  for (const p of allPeople) {
    if (peopleNames.has(p.name)) {
      personByName[p.name] = p.id;
    }
  }

  return c.html(
    GoalDetailView({
      ...viewProps(c, "/goals"),
      item: goal,
      portfolioItems,
      parentGoal,
      linkedMilestones,
      childGoals,
      personByName,
    }) as unknown as string,
  );
});
