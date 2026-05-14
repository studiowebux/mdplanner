// Risk view routes — factory-generated list + custom detail.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { riskConfig } from "../../domains/risk/config.tsx";
import { getRiskService } from "../../singletons/services.ts";
import { RiskDetailView } from "../risk-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const riskRouter = createDomainRoutes(riskConfig);

async function renderDetail(c: AppContext, id: string) {
  const item = await getRiskService().getById(id);
  if (!item) return c.notFound();
  return c.html(
    <RiskDetailView {...viewProps(c, "/risks")} item={item} />,
  );
}

riskRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  return renderDetail(c, id);
});
