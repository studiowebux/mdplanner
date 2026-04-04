// Retrospective view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { retrospectiveConfig } from "../../domains/retrospective/config.tsx";
import { getRetrospectiveService } from "../../singletons/services.ts";
import { RetrospectiveDetailView } from "../retrospective-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const retrospectivesRouter = createDomainRoutes(retrospectiveConfig);

retrospectivesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getRetrospectiveService().getById(id);
  if (!item) return c.notFound();

  return c.html(
    <RetrospectiveDetailView
      {...viewProps(c, "/retrospectives")}
      item={item}
    />,
  );
});
