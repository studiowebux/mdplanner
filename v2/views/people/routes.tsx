// People routes — factory-generated + custom detail view.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { peopleConfig } from "../../domains/people/config.tsx";
import {
  getPeopleService,
  getRetrospectiveService,
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
  const svc = getPeopleService();
  const person = await svc.getById(id);
  if (!person) return c.notFound();
  const [reports, allPeople, allRetros, vacations] = await Promise.all([
    svc.getDirectReports(id),
    svc.list(),
    getRetrospectiveService().list(),
    getVacationService().list({ personId: id }),
  ]);
  const manager = person.reportsTo ? await svc.getById(person.reportsTo) : null;
  // Filter retrospectives whose participants resolve to this person via the
  // same tolerant matcher the retrospective detail view uses for links.
  const retrospectives = allRetros.filter((r) =>
    r.participants.some((p) => resolvePersonByName(p, allPeople)?.id === id)
  );
  // Most recent first — matches the retrospectives ordering convention.
  vacations.sort((a, b) => b.startDate.localeCompare(a.startDate));
  return c.html(
    <PersonDetailView
      {...viewProps(c, "/people")}
      person={person}
      reports={reports}
      manager={manager}
      retrospectives={retrospectives}
      vacations={vacations}
    />,
  );
});
