// Brainstorm view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { brainstormConfig } from "../../domains/brainstorm/config.tsx";
import { getBrainstormService } from "../../singletons/services.ts";
import { BrainstormDetailView } from "../brainstorm-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const brainstormsRouter = createDomainRoutes(brainstormConfig);

brainstormsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getBrainstormService().getById(id);
  if (!item) return c.notFound();

  return c.html(
    <BrainstormDetailView
      {...viewProps(c, "/brainstorms")}
      item={item}
    />,
  );
});
