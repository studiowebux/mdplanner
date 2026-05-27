// Risk view routes — factory-generated list + custom detail.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { riskConfig } from "../../domains/risk/config.tsx";
import { getRiskService } from "../../singletons/services.ts";
import { RiskDetailView } from "../risk-detail.tsx";
import { RiskPreview } from "../components/risk-preview.tsx";
import { Sidenav } from "../../components/ui/sidenav.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { publish } from "../../singletons/event-bus.ts";

export const riskRouter = createDomainRoutes(riskConfig);

/** Render the detail page; `?editing=true` enables in-place description/mitigation editing. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getRiskService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <RiskDetailView
      {...viewProps(c, "/risks")}
      item={item}
      editing={editing}
    />,
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

riskRouter.get("/:id", (c) => renderDetail(c, c.req.param("id")));

// In-place description save (Edit Mode). Factory provides edit/delete routes.
riskRouter.put("/:id/description", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const description = String(body.description ?? "").trim() || undefined;
  await getRiskService().update(id, { description });
  publish("risk.updated");
  return renderDetail(c, id);
});

// In-place mitigation save (Edit Mode).
riskRouter.put("/:id/mitigation", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const mitigation = String(body.mitigation ?? "").trim() || undefined;
  await getRiskService().update(id, { mitigation });
  publish("risk.updated");
  return renderDetail(c, id);
});
