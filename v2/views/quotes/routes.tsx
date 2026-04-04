// Quote view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { quoteConfig } from "../../domains/quote/config.tsx";
import { getQuoteService } from "../../singletons/services.ts";
import { QuoteDetailView } from "../quote-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const quotesRouter = createDomainRoutes(quoteConfig);

quotesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const quote = await getQuoteService().getById(id);
  if (!quote) return c.notFound();

  return c.html(
    <QuoteDetailView
      {...viewProps(c, "/quotes")}
      item={quote}
    />,
  );
});
