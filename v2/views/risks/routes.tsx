// Risk view routes — factory-generated list + custom detail.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { riskConfig } from "../../domains/risk/config.tsx";
import { getRiskService } from "../../singletons/services.ts";
import { RiskDetailView } from "../risk-detail.tsx";
import { RiskPreview } from "../components/risk-preview.tsx";
import { Sidenav } from "../../components/ui/sidenav.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const riskRouter = createDomainRoutes(riskConfig);

async function renderDetail(c: AppContext, id: string) {
  const item = await getRiskService().getById(id);
  if (!item) return c.notFound();
  return c.html(
    <RiskDetailView {...viewProps(c, "/risks")} item={item} />,
  );
}

riskRouter.get("/:id/preview", async (c) => {
  const id = c.req.param("id");
  const item = await getRiskService().getById(id);
  if (!item) return c.notFound();
  return c.html(
    <Sidenav id="risks-form-container" title={item.title} open>
      <RiskPreview item={item} />
    </Sidenav>,
  );
});

riskRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  return renderDetail(c, id);
});
