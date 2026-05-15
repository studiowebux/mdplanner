// Investor view routes — factory-generated list + custom detail.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { investorConfig } from "../../domains/investor/config.tsx";
import { getInvestorService } from "../../singletons/services.ts";
import { InvestorDetailView } from "../investor-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const investorRouter = createDomainRoutes(investorConfig);

investorRouter.get("/:id", async (c: AppContext) => {
  const id = c.req.param("id");
  const item = await getInvestorService().getById(id!);
  if (!item) return c.notFound();
  return c.html(
    <InvestorDetailView {...viewProps(c, "/investors")} item={item} />,
  );
});
