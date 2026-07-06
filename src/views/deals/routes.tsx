// Deal view routes — factory-generated list/create/edit + custom detail route.
// Structured fields edit via the factory sidenav (GET/POST /:id/edit);
// `description` edits in-place via "Edit Mode" (?editing=true, PUT /:id/description).

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { dealConfig } from "../../domains/deal/config.tsx";
import { getDealService } from "../../singletons/services.ts";
import { DealDetailView } from "../deal-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { hxTrigger } from "../../utils/hx-trigger.ts";
import { DEAL_STAGES } from "../../types/deal.types.ts";

export const dealsRouter = createDomainRoutes(dealConfig);

async function renderDetail(c: AppContext, id: string) {
  const deal = await getDealService().getById(id);
  if (!deal) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <DealDetailView
      {...viewProps(c, "/deals")}
      item={deal}
      editing={editing}
    />,
  );
}

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

dealsRouter.get(
  "/:id",
  (c: AppContext) => renderDetail(c, c.req.param("id")!),
);

dealsRouter.put("/:id/description", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const description = String(body.description ?? "").trim() || undefined;
  await getDealService().update(id, { description });
  return renderDetail(c, id);
});
