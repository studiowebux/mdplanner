// BrainstormTemplate view routes — factory list/create/edit + custom detail.
// Structured fields edit via the factory sidenav (GET/POST /:id/edit);
// `description` edits in-place via "Edit Mode" (?editing=true, PUT /:id/description).

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { brainstormTemplateConfig } from "../../domains/brainstorm-template/config.tsx";
import { getBrainstormTemplateService } from "../../singletons/services.ts";
import { BrainstormTemplateDetailView } from "../brainstorm-template-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const brainstormTemplatesRouter = createDomainRoutes(
  brainstormTemplateConfig,
);

/** Render the detail page; `?editing=true` enables in-place description editing. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getBrainstormTemplateService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <BrainstormTemplateDetailView
      {...viewProps(c, "/brainstorm-templates")}
      item={item}
      editing={editing}
    />,
  );
}

brainstormTemplatesRouter.get(
  "/:id",
  (c: AppContext) => renderDetail(c, c.req.param("id")!),
);

// In-place description save (Edit Mode). Factory provides edit/delete routes.
brainstormTemplatesRouter.put("/:id/description", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const description = String(body.description ?? "").trim() || undefined;
  await getBrainstormTemplateService().update(id, { description });
  return renderDetail(c, id);
});
