// Reflection view routes — factory-generated list + custom detail.
// Structured fields edit via the factory sidenav (GET/POST /:id/edit);
// `content` edits in-place via "Edit Mode" (?editing=true, PUT /:id/content).

import type { AppContext } from "../../types/app.ts";
import { createDomainRoutes } from "../../factories/domain-routes.ts";
import { reflectionConfig } from "../../domains/reflection/config.tsx";
import {
  getReflectionService,
  getReflectionTemplateService,
} from "../../singletons/services.ts";
import { ReflectionDetailView } from "../reflection-detail.tsx";
import { viewProps } from "../../middleware/view-props.ts";

export const reflectionRouter = createDomainRoutes(reflectionConfig);

/** Render the detail page; `?editing=true` enables in-place content editing. */
async function renderDetail(c: AppContext, id: string) {
  const item = await getReflectionService().getById(id);
  if (!item) return c.notFound();
  const editing = c.req.query("editing") === "true";
  const template = item.templateId
    ? await getReflectionTemplateService().getById(item.templateId)
    : null;
  return c.html(
    <ReflectionDetailView
      {...viewProps(c, "/reflections")}
      item={item}
      template={template ?? null}
      editing={editing}
    />,
  );
}

reflectionRouter.get(
  "/:id",
  (c: AppContext) => renderDetail(c, c.req.param("id")!),
);

// In-place content save (Edit Mode). Factory provides edit/delete routes.
reflectionRouter.put("/:id/content", async (c: AppContext) => {
  const id = c.req.param("id")!;
  const body = await c.req.parseBody();
  const content = String(body.content ?? "").trim() || undefined;
  await getReflectionService().update(id, { content });
  return renderDetail(c, id);
});
