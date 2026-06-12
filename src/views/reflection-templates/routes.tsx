// ReflectionTemplate view routes — factory list/create/edit + custom detail.

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { reflectionTemplateConfig } from "../../domains/reflection-template/config.tsx";
import { getReflectionTemplateService } from "../../singletons/services.ts";
import { ReflectionTemplateDetailView } from "../reflection-template-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const reflectionTemplatesRouter = createDomainRoutes(
  reflectionTemplateConfig,
);

/** Render the detail page; `?editing=true` enables in-place description editing. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getReflectionTemplateService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  return c.html(
    <ReflectionTemplateDetailView
      {...viewProps(c, "/reflection-templates")}
      item={item}
      editing={editing}
    />,
  );
}

reflectionTemplatesRouter.get(
  "/:id",
  (c) => renderDetail(c, c.req.param("id")),
);

// In-place description save (Edit Mode). Factory provides edit/delete routes.
reflectionTemplatesRouter.put("/:id/description", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const description = String(body.description ?? "").trim() || undefined;
  await getReflectionTemplateService().update(id, { description });
  return renderDetail(c, id);
});
