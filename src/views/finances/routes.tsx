// Finance view routes — factory list/create/edit + detail route.
// Structured fields edit via the factory sidenav; `description` (rendered as
// "Notes") edits in-place via "Edit Mode" (?editing=true, PUT /:id/description).

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { financeConfig } from "../../domains/finance/config.tsx";
import { getFinanceService } from "../../singletons/services.ts";
import { FinanceDetailView } from "../finance-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { publish } from "../../singletons/event-bus.ts";

export const financesRouter = createDomainRoutes(financeConfig);

async function renderDetail(c: AppContext, id: string) {
  const entry = await getFinanceService().getById(id);
  if (!entry) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <FinanceDetailView
      {...viewProps(c, "/finances")}
      item={entry}
      editing={editing}
    />,
  );
}

financesRouter.get(
  "/:id",
  (c: AppContext) => renderDetail(c, c.req.param("id")!),
);

financesRouter.put("/:id/description", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const description = String(body.description ?? "").trim() || undefined;
  await getFinanceService().update(id, { description });
  publish("finance.updated");
  return renderDetail(c, id);
});
