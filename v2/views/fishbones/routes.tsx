// Fishbone view routes — factory-generated list + custom detail.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { fishboneConfig } from "../../domains/fishbone/config.tsx";
import { getFishboneService } from "../../singletons/services.ts";
import { FishboneDetailView } from "../fishbone-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const fishboneRouter = createDomainRoutes(fishboneConfig);

async function renderDetail(c: AppContext, id: string) {
  const item = await getFishboneService().getById(id);
  if (!item) return c.notFound();
  return c.html(
    <FishboneDetailView {...viewProps(c, "/fishbones")} item={item} />,
  );
}

fishboneRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  return renderDetail(c, id);
});
