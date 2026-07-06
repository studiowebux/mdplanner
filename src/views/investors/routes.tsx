// Investor view routes — factory-generated list + custom detail.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { investorConfig } from "../../domains/investor/config.tsx";
import { getInvestorService } from "../../singletons/services.ts";
import { InvestorDetailView } from "../investor-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const investorRouter = createDomainRoutes(investorConfig);

/** Render the detail page; `?editing=true` enables in-place notes editing. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getInvestorService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <InvestorDetailView
      {...viewProps(c, "/investors")}
      item={item}
      editing={editing}
    />,
  );
}

investorRouter.get(
  "/:id",
  (c: AppContext) => renderDetail(c, c.req.param("id")!),
);

// In-place notes save (Edit Mode). Factory provides edit/delete routes.
investorRouter.put("/:id/notes", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getInvestorService().update(id, { notes });
  return renderDetail(c, id);
});
