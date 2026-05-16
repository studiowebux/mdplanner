// Deal view routes — factory-generated list/create/edit + custom detail route.

import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { dealConfig } from "../../domains/deal/config.tsx";
import { getDealService } from "../../singletons/services.ts";
import { DealDetailView } from "../deal-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { publish } from "../../singletons/event-bus.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";
import { DEAL_STAGES } from "../../types/deal.types.ts";

export const dealsRouter = createDomainRoutes(dealConfig);

dealsRouter.post("/:id/stage", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const stage = String(body.stage ?? "");
  if (!DEAL_STAGES.includes(stage as typeof DEAL_STAGES[number])) {
    return new Response(null, {
      status: 422,
      headers: { "HX-Trigger": hxTrigger("error", "Invalid stage") },
    });
  }
  const deal = await getDealService().update(id, {
    stage: stage as typeof DEAL_STAGES[number],
  });
  if (!deal) return c.notFound();
  publish("deal.updated");
  return new Response(null, {
    status: 204,
    headers: {
      "HX-Trigger": hxTrigger("success", `Moved to ${stage}`),
      "HX-Location": JSON.stringify({
        path: "/deals/view",
        target: "#deals-view",
        swap: "outerHTML",
      }),
    },
  });
});

dealsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const deal = await getDealService().getById(id);
  if (!deal) return c.notFound();
  return c.html(
    <DealDetailView {...viewProps(c, "/deals")} item={deal} />,
  );
});
