// Finance view routes — factory list/create/edit + detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { financeConfig } from "../../domains/finance/config.tsx";
import { getFinanceService } from "../../singletons/services.ts";
import { FinanceDetailView } from "../finance-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const financesRouter = createDomainRoutes(financeConfig);

financesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const entry = await getFinanceService().getById(id);
  if (!entry) return c.notFound();
  return c.html(
    <FinanceDetailView {...viewProps(c, "/finances")} item={entry} />,
  );
});
