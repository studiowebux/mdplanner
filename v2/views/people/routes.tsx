// People routes — factory-generated + custom detail view.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { peopleConfig } from "../../domains/people/config.tsx";
import {
  getGoalService,
  getPeopleService,
  getRetrospectiveService,
  getTaskService,
  getVacationService,
} from "../../singletons/services.ts";
import { PersonDetailView } from "../person-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { resolvePersonByName } from "../../utils/person-name-match.ts";

export const peopleRouter = createDomainRoutes(peopleConfig);

// Detail view — shows direct reports + retrospectives participated in, so it
// stays custom.
peopleRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const showCompleted = c.req.query("show_completed") === "true";
  const svc = getPeopleService();
  const person = await svc.getById(id);
  if (!person) return c.notFound();
  const [reports, allPeople, allRetros, vacations, assignedTasksRaw, allGoals] =
    await Promise.all([
      svc.getDirectReports(id),
      svc.list(),
      getRetrospectiveService().list(),
      getVacationService().list({ personId: id }),
      getTaskService().list({ assignee: id }),
      getGoalService().list(),
    ]);
  const manager = person.reportsTo ? await svc.getById(person.reportsTo) : null;
  // Filter retrospectives whose participants resolve to this person via the
  // same tolerant matcher the retrospective detail view uses for links.
  const retrospectives = allRetros.filter((r) =>
    r.participants.some((p) => resolvePersonByName(p, allPeople)?.id === id)
  );
  // Most recent first — matches the retrospectives ordering convention.
  vacations.sort((a, b) => b.startDate.localeCompare(a.startDate));

  // Assigned tasks — assignee stores person ID (per [decision] assigneeIsId).
  // Sort by priority (1 = highest) then due_date, missing values last.
  const assignedTasks = (showCompleted
    ? assignedTasksRaw
    : assignedTasksRaw.filter((t) =>
      !t.completed
    ))
    .slice()
    .sort((a, b) => {
      const pa = a.priority ?? 99;
      const pb = b.priority ?? 99;
      if (pa !== pb) return pa - pb;
      const da = a.due_date ?? "9999-99-99";
      const db = b.due_date ?? "9999-99-99";
      return da.localeCompare(db);
    });

  // Assigned goals — owner stores person name (no service-side filter).
  const assignedGoals = allGoals
    .filter((g) => g.owner === person.name)
    .filter((g) =>
      showCompleted || (g.status !== "success" && g.status !== "failed")
    )
    .slice()
    .sort((a, b) =>
      a.status.localeCompare(b.status) || a.title.localeCompare(b.title)
    );

  return c.html(
    <PersonDetailView
      {...viewProps(c, "/people")}
      person={person}
      reports={reports}
      manager={manager}
      retrospectives={retrospectives}
      vacations={vacations}
      assignedTasks={assignedTasks}
      assignedGoals={assignedGoals}
      showCompleted={showCompleted}
    />,
  );
});
