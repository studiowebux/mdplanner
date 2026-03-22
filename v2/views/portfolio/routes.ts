// Portfolio routes — factory-generated + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { portfolioConfig } from "../../domains/portfolio/config.tsx";
import { getPortfolioService } from "../../singletons/services.ts";
import { PortfolioDetailView } from "../portfolio-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const portfolioRouter = createDomainRoutes(portfolioConfig);

portfolioRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await getPortfolioService().getById(id);
  if (!item) return c.notFound();
  return c.html(
    PortfolioDetailView({
      ...viewProps(c, "/portfolio"),
      item,
    }) as unknown as string,
  );
});
