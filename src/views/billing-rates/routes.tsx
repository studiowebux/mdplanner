// BillingRate view routes — factory-generated list/create/edit + custom detail route.
// Structured fields edit via the factory sidenav (GET/POST /:id/edit);
// `notes` edits in-place via "Edit Mode" (?editing=true, PUT /:id/notes).

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { billingRateConfig } from "../../domains/billing-rate/config.tsx";
import { getBillingRateService } from "../../singletons/services.ts";
import { BillingRateDetailView } from "../billing-rate-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { publish } from "../../singletons/event-bus.ts";

export const billingRatesRouter = createDomainRoutes(billingRateConfig);

/** Render the detail page; `?editing=true` enables in-place notes editing. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getBillingRateService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <BillingRateDetailView
      {...viewProps(c, "/billing-rates")}
      item={item}
      editing={editing}
    />,
  );
}

billingRatesRouter.get(
  "/:id",
  (c: AppContext) => renderDetail(c, c.req.param("id")!),
);

// In-place notes save (Edit Mode). Factory provides edit/delete routes.
billingRatesRouter.put("/:id/notes", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getBillingRateService().update(id, { notes });
  publish("billing-rate.updated");
  return renderDetail(c, id);
});
