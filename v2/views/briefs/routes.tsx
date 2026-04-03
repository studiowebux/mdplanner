// Brief view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { briefConfig } from "../../domains/brief/config.tsx";
import { getBriefService } from "../../singletons/services.ts";
import { BriefDetailView } from "../brief-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const briefsRouter = createDomainRoutes(briefConfig);

briefsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getBriefService().getById(id);
  if (!item) return c.notFound();

  return c.html(
    <BriefDetailView
      {...viewProps(c, "/briefs")}
      item={item}
    />,
  );
});
