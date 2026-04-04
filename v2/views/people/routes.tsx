// People routes — factory-generated + custom detail view.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { peopleConfig } from "../../domains/people/config.tsx";
import { getPeopleService } from "../../singletons/services.ts";
import { PersonDetailView } from "../person-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const peopleRouter = createDomainRoutes(peopleConfig);

// Detail view — shows direct reports, so it stays custom.
peopleRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const svc = getPeopleService();
  const person = await svc.getById(id);
  if (!person) return c.notFound();
  const reports = await svc.getDirectReports(id);
  const manager = person.reportsTo ? await svc.getById(person.reportsTo) : null;
  return c.html(
    <PersonDetailView
      {...viewProps(c, "/people")}
      person={person}
      reports={reports}
      manager={manager}
    />,
  );
});
