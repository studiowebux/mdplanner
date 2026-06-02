// SWOT view routes — factory-generated list + shared inline quadrant editing
// via registerSectionEditRoutes + canonical notes Edit Mode.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { registerSectionEditRoutes } from "../../factories/section-edit-routes.tsx";
import { swotConfig } from "../../domains/swot/config.tsx";
import { getSwotService } from "../../singletons/services.ts";
import { SwotDetailView } from "../swot-detail.tsx";
import { SWOT_QUADRANTS } from "../../domains/swot/constants.tsx";
import { viewProps } from "../../middleware/view-props.ts";
import { publish } from "../../singletons/event-bus.ts";

export const swotRouter = createDomainRoutes(swotConfig);

/** Re-render the detail page after a notes save. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getSwotService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <SwotDetailView
      {...viewProps(c, "/swot")}
      item={item}
      editing={editing}
    />,
  );
}

// In-place notes save (Edit Mode). Registered BEFORE registerSectionEditRoutes
// so it wins the trie lookup over PUT /:id/:section/:index (segment counts
// differ — no actual conflict — but defensive).
swotRouter.put("/:id/notes", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getSwotService().update(id, { notes });
  publish("swot.updated");
  return renderDetail(c, id);
});

registerSectionEditRoutes(swotRouter, {
  path: "/swot",
  ssePrefix: "swot",
  sections: SWOT_QUADRANTS.map((n) => n.toLowerCase()),
  getService: getSwotService,
  DetailView: SwotDetailView,
});
