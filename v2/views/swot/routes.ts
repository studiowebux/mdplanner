// SWOT view routes — factory-generated list + custom detail.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { swotConfig } from "../../domains/swot/config.tsx";
import { getSwotService } from "../../singletons/services.ts";
import { SwotDetailView } from "../swot-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const swotRouter = createDomainRoutes(swotConfig);

// Custom detail route — renders full detail page with quadrant grid.
swotRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const swot = await getSwotService().getById(id);
  if (!swot) return c.notFound();

  return c.html(
    SwotDetailView({
      ...viewProps(c, "/swot"),
      item: swot,
    }) as unknown as string,
  );
});
