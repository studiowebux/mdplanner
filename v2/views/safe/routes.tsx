// SAFe view routes — factory-generated list + detail.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { safeConfig } from "../../domains/safe/config.tsx";
import { getSafeService } from "../../singletons/services.ts";
import { SafeDetailView } from "../safe-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const safeRouter = createDomainRoutes(safeConfig);

async function renderDetail(c: AppContext, id: string) {
  const item = await getSafeService().getById(id);
  if (!item) return c.notFound();
  return c.html(
    <SafeDetailView {...viewProps(c, "/safe")} item={item} />,
  );
}

safeRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  return renderDetail(c, id);
});
