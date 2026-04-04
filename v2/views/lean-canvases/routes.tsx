// Lean Canvas view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { leanCanvasConfig } from "../../domains/lean-canvas/config.tsx";
import { getLeanCanvasService } from "../../singletons/services.ts";
import { LeanCanvasDetailView } from "../lean-canvas-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const leanCanvasesRouter = createDomainRoutes(leanCanvasConfig);

leanCanvasesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getLeanCanvasService().getById(id);
  if (!item) return c.notFound();

  return c.html(
    <LeanCanvasDetailView
      {...viewProps(c, "/lean-canvases")}
      item={item}
    />,
  );
});
