// Business Model Canvas view routes — factory list + shared inline section
// editing via registerSectionEditRoutes. `notes` edits in-place via the
// canonical Edit Mode (?editing=true, PUT /:id/notes).

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { registerSectionEditRoutes } from "../../factories/section-edit-routes.tsx";
import { businessModelConfig } from "../../domains/business-model/config.tsx";
import { getBusinessModelService } from "../../singletons/services.ts";
import { BusinessModelDetailView } from "../business-model-detail.tsx";
import { BUSINESS_MODEL_SECTION_KEYS } from "../../types/business-model.types.ts";
import { viewProps } from "../../middleware/view-props.ts";

export const businessModelRouter = createDomainRoutes(businessModelConfig);

// In-place notes save (Edit Mode). Registered before the section-edit factory
// so the literal "/notes" path isn't intercepted by section handlers.
businessModelRouter.put("/:id/notes", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const notes = String(body.notes ?? "").trim() || undefined;
  await getBusinessModelService().update(id, { notes });
  const item = await getBusinessModelService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <BusinessModelDetailView
      {...viewProps(c, "/business-models")}
      item={item}
      editing={editing}
    />,
  );
});

registerSectionEditRoutes(businessModelRouter, {
  path: "/business-models",
  sections: BUSINESS_MODEL_SECTION_KEYS,
  getService: getBusinessModelService,
  DetailView: BusinessModelDetailView,
});
